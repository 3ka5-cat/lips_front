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
    loadLeads();
    $('.leads').show();
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
            renderLeadsPage();
        },
        '#company': function() {
            var id = url.split('#company/')[1].trim();
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
    $.ajaxSetup({
        headers : {
            'Authorization': Cookies.get('jwt')
        }
    });
    $.getJSON(API_DOMAIN.concat('company/').concat(company_id))
            .done(function(response) {
                if (response.status === 'success') {
                    $('#name').text(response.data.name);
                    $('#area').text('(' + response.data.area + ')');
                    $('<a>', {
                        href: response.data.site_url,
                        text: response.data.site_url
                    }).appendTo('#site_url');
                    $('#description').html(response.data.description);
                }
                else {
                    $('#error_msg').text(ERR_MSG).show();
                }
            })
            .fail(function (jqxhr, textStatus, error) {
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

function loadLeads() {
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
                            {'data': 'name', 'title': 'Имя'},
                            {'data': 'email', 'title': 'Email'},
                            {
                                'data': 'company_id',
                                'searchable': false,
                                'orderable': false,
                                'title': 'Компания',
                                'className': 'dt-body-center',
                                'render': function (company_id, type, full) {
                                    return '<a href=' + '#company/'.concat(company_id) + '>' +
                                        '<i class="fa fa-building-o" aria-hidden="true"></i></a>';
                                }
                            },
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
                var error_txt = ERR_MSG +
                    '<br>Code: ' + jqxhr.responseJSON.code +
                    ' Message: ' + jqxhr.responseJSON.message;
                $('#error_msg').html(error_txt).show();
            }
            else
                $('#error_msg').text(ERR_MSG).show();
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
            window.location.hash = 'leads';
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

function logout() {
    Cookies.remove('jwt');
    window.location.hash = '#';
}

$(document).ready(function() {
    $(window).on('hashchange', function() {
        $('#error_msg').text('').hide();
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

    $(window).trigger('hashchange');
});
