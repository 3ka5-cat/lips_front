var DEBUG = false;
var API_DOMAIN = 'https://api.topseller.market/';
if (DEBUG)
    API_DOMAIN = 'http://192.168.1.37:8080/';

var ERR_MSG = 'Ошибка при работе с сервером';

function isLoggedIn() {
    return typeof Cookies.get('jwt') !== 'undefined';
}

function renderLoginPage() {
    if (isLoggedIn()) {
        window.location.hash = 'leads';
    }
    else {
        $('.login').show();
    }
}

function renderLeadsPage() {
    loadLeadList();
    $('.leads').show();
}

function renderLeadPage(id) {
    loadLead(id);
    $('#leads_link').show();
    $('.lead').show();
}

function renderCompanyPage(id) {
    loadCompany(id);
    $('#leads_link').show();
    $('.company').show();
}

function renderErrorPage() {
    $('.error').show();
}

function route(url) {
    var path = url.split('/')[0];

    var ROUTES = {
        '': function() {
            renderLoginPage();
        },
        '#logout': function() {
            logout();
        },
        '#leads': function() {
            var id = url.split('#leads/')[1];
            if (typeof(id) != 'undefined')
                renderLeadPage(id.trim());
            else
                renderLeadsPage();
        },
        '#companies': function() {
            var id = url.split('#companies/')[1].trim();
            renderCompanyPage(id);
        }
    };

    if (ROUTES[path]) {
        ROUTES[path]();
    }
    else
        renderErrorPage();
}

function loadCompany(company_id) {
    function cleanUp() {
        $('#name').text('');
        $('#area').text('');
        $('#industry').text('');
        $('#site_url').text('');
        $('#industry_list').text('');
        $('#leads_list').text('');
        $('#description').text('');
    }
    $.ajaxSetup({
        headers : {
            'Authorization': Cookies.get('jwt')
        }
    });
    $.getJSON(API_DOMAIN.concat('company/').concat(company_id))
            .done(function(response) {
                if (response.status === 'success') {
                        cleanUp();
                        $('#name').text(response.data.company_name || 'Название компании не указано');
                        $('#area').text(response.data.company_area || 'Месторасположение не указано');
                        $('#industry').text(response.data.company_industry || 'Сфера деятельности не указана');
                        if (response.data.company_site_url) {
                            $('#site_url').html(
                                $('<a>', {
                                    href: response.data.company_site_url,
                                    text: response.data.company_site_url,
                                    target: "_blank"
                                }));
                        }
                        else
                            $('#site_url').text('Сайт не указан');
                        $('#description').html(response.data.company_description || 'Описание отсутствует');
                        var industry_list = $('<ul>');
                        $.each(response.data.vacancy_specializations, function(i, item) {
                            industry_list.append($('<li>', {text: item}))
                        });
                        $('#industry_list').html(industry_list || 'Список потенциальных сфер деятельности пуст');
                        var lead_list = $('<ul>');
                        $.each(response.data.leads, function(i, item) {
                            var e = $('<li>');
                            $('<a>', {
                                    href: '#leads/' + item[0],
                                    html: '<i class="fa fa-envelope-o"></i> ' + (item[1] || 'Имя не указано')
                                }).appendTo(e);
                            lead_list.append(e);
                        });
                        $('#leads_list').html(lead_list || 'Список лидов пуст');
                }
                else {
                    cleanUp();
                    $('#error_msg').text(ERR_MSG).show();
                }
            })
            .fail(function (jqxhr, textStatus, error) {
                if (typeof jqxhr.responseJSON !== 'undefined') {
                    if (jqxhr.responseJSON.code == 401) {
                        window.location.hash = '#';
                    } else {
                        cleanUp();
                        var error_txt = ERR_MSG +
                            '<br>Code: ' + jqxhr.responseJSON.code +
                            ' Message: ' + jqxhr.responseJSON.message;
                        $('#error_msg').html(error_txt).show();
                    }
                }
                else {
                    cleanUp();
                    $('#error_msg').text(ERR_MSG).show();
                }
            });
}

function loadLeadList() {
    $.ajaxSetup({
        headers : {
            'Authorization': Cookies.get('jwt')
        }
    });
    $.getJSON(API_DOMAIN.concat('lead'))
        .done(function(response) {
            if (response.status === 'success') {
                if (!$.fn.dataTable.isDataTable('#leads')) {
                    var t = $('#leads').DataTable({
                        'data': response.data,
                        'processing': true,
                        'columns': [
                            {
                                'searchable': false,
                                'orderable': false,
                                'title': '#',
                                'data': null
                            },
                            {
                                'data': 'timestamp',
                                'title': 'Дата',
                                'className': 'dt-body-nowrap',
                                'render': function (date, type, full) {
                                    return new Date(date).toDateString();
                                }
                            },
                            {
                                'data': 'company_name',
                                'title': 'Компания',
                                'render': function (company_id, type, full) {
                                    return '<a href=' + '#companies/'.concat(full.company_id) + '>' +
                                        full.company_name + '</a>';
                                }
                            },
                            {
                                'data': 'name',
                                'title': 'Имя',
                                'render': function (name, type, full) {
                                    return '<a href=' + '#leads/'.concat(full.id) + '>' +
                                        name + '</a>';
                                }
                            },
                            {'data': 'email', 'title': 'Email'},
                            {
                                'data': 'phones',
                                'orderable': false,
                                'title': 'Телефон',
                                'render': function (phones, type, full) {
                                    var data = [];
                                    $.each(phones, function (i, phone) {
                                        var phone_td = phone.country + phone.city + phone.number;
                                        data.push(phone_td);
                                        if (phone.comment !== null)
                                            data.push(phone.comment);
                                    });
                                    return data;
                                }
                            }
                        ]
                    });
                    t.on('order.dt search.dt', function () {
                        t.column(0, {search: 'applied', order: 'applied'}).nodes().each(function (cell, i) {
                            cell.innerHTML = i + 1;
                        });
                    }).draw();
                }
            }
            else {
                $('#error_msg').text(ERR_MSG).show();
            }
        })
        .fail(function (jqxhr, textStatus, error) {
            if (typeof jqxhr.responseJSON !== 'undefined') {
                if (jqxhr.responseJSON.code == 401) {
                    window.location.hash = '#';
                } else {
                    var error_txt = ERR_MSG +
                        '<br>Code: ' + jqxhr.responseJSON.code +
                        ' Message: ' + jqxhr.responseJSON.message;
                    $('#error_msg').html(error_txt).show();
                }
            }
            else
                $('#error_msg').text(ERR_MSG).show();
        });
}

function loadLead(lead_id) {
    function cleanUp() {
        $('#subject').text('');
        $('#text').text('');
        $('#company_name').html('');
        $('#lead_name').html('');
        $('#lead_email').html('');
    }
    $.ajaxSetup({
        headers : {
            'Authorization': Cookies.get('jwt')
        }
    });
    $.getJSON(API_DOMAIN.concat('lead/').concat(lead_id))
        .done(function(response) {
            if (response.status === 'success') {
                cleanUp();
                $('#subject').val(response.data.letter.subject);
                $('#text').val(response.data.letter.text);
                $('<a>', {
                    href: '#companies/'.concat(response.data.company.id),
                    html: '<i class="fa fa-building-o" aria-hidden="true"></i> ' + response.data.company.name
                }).appendTo('#company_name');
                $('#lead_name').text(response.data.lead.name || 'Имя не указано');
                $('#lead_email').text(response.data.lead.email || 'Email не указан');
            }
            else {
                cleanUp();
                $('#error_msg').text(ERR_MSG).show();
            }
        })
        .fail(function (jqxhr, textStatus, error) {
            if (typeof jqxhr.responseJSON !== 'undefined') {
                if (jqxhr.responseJSON.code == 401) {
                    window.location.hash = '#';
                } else {
                    cleanUp();
                    var error_txt = ERR_MSG +
                        '<br>Code: ' + jqxhr.responseJSON.code +
                        ' Message: ' + jqxhr.responseJSON.message;
                    $('#error_msg').html(error_txt).show();
                }
            }
            else {
                cleanUp();
                $('#error_msg').text(ERR_MSG).show();
            }
        });
}

function login() {
    var data = {
        username: $('#username').val(),
        password: $('#pass').val()
    };
    $('#username').val('');
    $('#pass').val('');

    $.ajax({
        type: 'POST',
        url: API_DOMAIN.concat('auth'),
        data: JSON.stringify(data),
        dataType : 'json',
        contentType : 'application/json'
    }).done(function(response) {
        if (response.status === 'success') {
            if (DEBUG)
                Cookies.set('jwt', response.data);
            else
                Cookies.set('jwt', response.data, {secure: true});
            $('#auth_error_msg').text('').hide();
            window.location.hash = 'leads';
        }
        else {
            $('#auth_error_msg').text(ERR_MSG).show();
        }
    }).fail(function (jqxhr, textStatus, error) {
        if (typeof jqxhr.responseJSON !== 'undefined') {
            var error_txt;
            if (jqxhr.responseJSON.code == 401 &&
                jqxhr.responseJSON.message == 'Unable to authenticate User')
                error_txt = 'Неверный логин или пароль';
            else {
                error_txt = ERR_MSG +
                    '<br>Code: ' + jqxhr.responseJSON.code +
                    ' Message: ' + jqxhr.responseJSON.message;
            }
            $('#auth_error_msg').html(error_txt).show();
        }
        else
            $('#auth_error_msg').text(ERR_MSG).show();
    });
}

function logout() {
    Cookies.remove('jwt');
    window.location.hash = '#';
}

function updateCompany() {
    var data = {
        industry: $('#new_industry').val()
    };
    var url = decodeURI(window.location.hash);
    var id = url.split('#companies/')[1].trim();
    $.ajax({
        type: 'POST',
        url: API_DOMAIN.concat('company/').concat(id),
        data: JSON.stringify(data),
        dataType : 'json',
        contentType : 'application/json'
    }).done(function(response) {
        if (response.status === 'success') {
            $('#ok_msg').text('Изменения сохранены').show();
            $('#companyForm').hide();
            $('#saveCompany').hide();
        }
        else {
            $('#error_msg').text(ERR_MSG).show();
        }
    }).fail(function (jqxhr, textStatus, error) {
        if (typeof jqxhr.responseJSON !== 'undefined') {
            var error_txt = ERR_MSG +
                    '<br>Code: ' + jqxhr.responseJSON.code +
                    ' Message: ' + jqxhr.responseJSON.message;
            $('#error_msg').html(error_txt).show();
        }
        else
            $('#error_msg').text(ERR_MSG).show();
    });

}

$(document).ready(function() {
    $(window).on('hashchange', function() {
        $('#error_msg').text('').hide();
        $('#ok_msg').text('').hide();
        $('.container .page').hide();
        $('#leads_link').hide();
        if (!isLoggedIn())
            $('#logout').hide();
        else
            $('#logout').show();
        route(decodeURI(window.location.hash));
    });

    $('#loginForm').submit(function (e) {
        e.preventDefault();
        return login();
    });

    $('#saveCompany').click(function (e) {
        e.preventDefault();
        return updateCompany();
    });

    $('#editCompany').click(function (e) {
        e.preventDefault();
        $('#companyForm').toggle();
        $('#saveCompany').toggle();
    });

    $(window).trigger('hashchange');
});
