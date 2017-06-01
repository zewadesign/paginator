if (typeof Object.assign != 'function') {
    Object.assign = function(target) {
        'use strict';
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        target = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index];
            if (source != null) {
                for (var key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key];
                    }
                }
            }
        }
        return target;
    };
}

var zewa = zewa || Object.create(null);
zewa.paginator = (function($){
    var pagination = [];


    var formatQueryString = function(currentURL, newQueryStringParams) {
        if(currentURL === undefined || newQueryStringParams === undefined) {
            return;
        }
        var currentURL = currentURL.split('#')[0];
        var queryString = currentURL.split('?')[1];
        var currentParsed = querystring.parse(queryString);
        var parsed = querystring.parse(newQueryStringParams);
        var combined = Object.assign(currentParsed, parsed);

        return '?'+querystring.stringify(combined);

    }

    var buildQueryURL = function(paginator) {

        var query, currentQueryString, localSearchData = paginator.searchObject.serialize();

        query = 'page=' + paginator.page
            + '&' + 'offset=' + paginator.offset;

        //if sort is set
        if(paginator.sort[0] !== undefined) {
            query += '&sort=' + paginator.sort[0] + '&direction=' + paginator.sort[1];
        }

        if(localSearchData !== false) {
            query += '&' + localSearchData;
        }

        currentQueryString = formatQueryString(paginator.sourceURL, query);

        return paginator.sourceURL + currentQueryString;

    };

    var togglePaginationControl = function(paginator) {

        if(paginator.page === 1) {
            paginator.wrapper.find('[data-paginate-direction="previous"]').hide();
        } else {
            paginator.wrapper.find('[data-paginate-direction="previous"]').show();
        }

        if(paginator.lastPage === true) {
            $(paginator.wrapper.find('[data-paginate-direction="next"]')).hide();
        } else {
            paginator.wrapper.find('[data-paginate-direction="next"]').show();
        }

    };

    var renderResults = function(paginator, results) {

        if(results === "") {
            paginator.lastPage = true;
            paginator.container.html(paginator.previousResponse);
        } else {
            paginator.lastPage = false;

            if(paginator.initialRun === true || paginator.type == 'traditional' && results !== "") {
                paginator.container.html('');
                paginator.container.append(results);
            } else {
                prepareInfinityPaginator(paginator);
                paginator.container.append(results);
            }
        }

        togglePaginationControl(paginator);
        paginator.initialRun = false;
    };

    var requestResults = function(paginator, callback, clear){
        if(paginator.active !== false) {
            paginator.active.abort();
        }
        paginator.active = true;

        if(paginator.type == 'traditional' && paginator.initialRun !== true) {
            $('html, body').animate({
                scrollTop: paginator.wrapper.offset().top / 2
            }, 150);
        }

        var activeURL = buildQueryURL(paginator);

        $.get(activeURL, function (response) {

            if(clear === true) {
                paginator.container.html('');
            }

            renderResults(paginator, response.trim());
            if(response.trim() !== "") {
                paginator.previousResponse = response.trim();
            }

            if(typeof paginator.callback === 'function') {
                paginator.callback();
            }
            if (typeof callback === 'function') {
                callback();
            } // @TODO error handler, throw exception if not a function
            paginator.active = false;
        });

    };

    var preparePaginatorSearch = function(paginator) {
        //defer binding event for any on page
        //JS plugins to clear their event firing
        setTimeout(function(){
            paginator.wrapper.on('keypress change', '.paginated-search :input', function(e){

            //Set the page back to 1, since we're searching.
                paginator.page = 1;
                if(e.which !== undefined && e.which !== 0 && e.which !== 9 && e.which !== 18) {
                    //return valid, but non-related keypresses
                    if(e.which >= 90 && e.which <= 48 && e.which != 8 && e.which != 13) {
                        return;
                    }
                }

                // enter key, or on change
                if(e.which === 13 || e.which === undefined) {
                    paginator.container.html(paginator.loader);

                    paginator.searchData = false;
                    $(paginator.searchObject).each(function (key, value) {
                        if ($(value).val().trim() != "") {
                            paginator.searchData = true;
                        }
                    });

                    requestResults(paginator, null, true);
                    return false;
                }
            });
        },200);
    };

    var prepareSort = function(paginator)
    {
        paginator.wrapper.on('click', '[data-sortable]', function(){
            var sortable = $(this).attr('data-sortable');
            if(sortable != "") {
                paginator.sort[0] = sortable;
                if(paginator.activeSortOrder == 'DESC') {
                    paginator.sort[1] = 'ASC';
                    paginator.activeSortOrder = 'ASC';
                    // paginator.activeSortOrder = 'ASC';
                } else {
                    paginator.sort[1] = 'DESC';
                    paginator.activeSortOrder = 'DESC';
                    // paginator.activeSortOrder = 'DESC';
                }
            }

            paginator.container.html('');
            requestResults(paginator);
        });
    }

    var prepareTraditionalPaginator = function(paginator) {
        paginator.buttons.removeClass('hide');
        paginator.wrapper.on('click', '.paginated-buttons a', function (e) {
            var that = $(this);
            paginator.direction = that.data('paginate-direction');

            paginator.container.html(paginator.loader);
            if(paginator.direction == 'next' && paginator.lastPage !== true) {
                paginator.page++;
            } else if(paginator.direction == 'previous' && paginator.page > 0) {
                paginator.page--;
            }

            paginator.paging = true;
            requestResults(paginator, function(){
                paginator.paging = false;
            });
        });
    };


    var scrollable = function (e, paginator) {
        if ((paginator.autoload === false && paginator.initialRun === true) || paginator.lastPage === true) return;

        var that = $(e.target),
            touchy = paginator.touchy + 10,
            currentScroll,
            scroll;


        if(e.target === document) {
            scroll = ($(document).height() - $(window).height());
            currentScroll = $(window).scrollTop() + 10;
        } else {
            scroll = that.height() * paginator.page;
            currentScroll = that.innerHeight() + that.scrollTop();
        }

        if (paginator.active === false && currentScroll >= paginator.position && currentScroll > scroll) {

            paginator.container.append(paginator.loader);
            paginator.page++;
            paginator.paging = true;
            requestResults(paginator, function () {
                paginator.paging = false;
                paginator.container.find('.loader').remove();
            });
        }
        paginator.position = currentScroll;
    };

    var prepareInfinityPaginator = function(paginator) {
        if(paginator.wrapper.css('max-height') !== 'none') {
            paginator.wrapper.on("scroll",  function (e) {
                scrollable(e, paginator);
            });
            paginator.container.on('mousewheel DOMMouseScroll', function (e) {
                var e0 = e.originalEvent,
                    delta = e0.wheelDelta || -e0.detail;

                this.scrollTop += ( delta < 0 ? 1 : -1 ) * 30;
                e.preventDefault();
            });
        } else {
            $(window).on("scroll", function(e){
                scrollable(e, paginator);
            });
        }
    };

    var preparePaginator = function(paginator) {

        switch(paginator.type) {
            case 'traditional':
                prepareTraditionalPaginator(paginator);
                break;
            case 'infinity':
                prepareInfinityPaginator(paginator);
                break;
        }
        prepareSort(paginator);
        preparePaginatorSearch(paginator);


        if(paginator.autoload === true) {
            requestResults(paginator);
        }
    };

    var Paginator = function(alias, wrapper) {
        this.wrapper = wrapper;
        this.container = wrapper.find('.paginated-container');
        this.loader = this.container.find('.loader').clone();
        this.sourceURL = wrapper.data('paginate-url');
        // this.queryPrefix = wrapper.data('paginate-query-prefix');
        this.type = wrapper.data('paginate-type');
        this.touchy = parseInt(wrapper.data('paginate-touchy'));
        this.offset = wrapper.data('paginate-per-page');
        this.cache = wrapper.data('paginate-cache');
        this.pulse = wrapper.data('paginate-pulse');
        this.buttons = wrapper.find('.paginated-buttons');
        this.searchObject = wrapper.find('.paginated-search :input');
        this.alias = alias;
        this.paging = false;
        this.position = this.wrapper.scrollTop();
        this.searchData = false;
        this.active = false;
        this.queue = false;
        this.total = false;
        this.callback = false;
        this.lastPage = false;
        this.initialRun = true;
        this.activeSortOrder = 'DESC';
        this.sort = [];
        this.innerScroll = false;

        if(wrapper.data('paginate-autoload') === true) {
            this.autoload = true;
        } else {
            this.autoload = false;
            this.container.find('.loader').remove();
        }

        if(wrapper.data('paginate-page') !== undefined && wrapper.data('paginate-page') != 0) {
            this.page = wrapper.data('paginate-page');
        } else {
            this.page = 1;
        }

        var headers = wrapper.find('[data-sortable]');
        var that = this;
        if(headers.eq(0).attr('data-sortable') != "") {
            that.sort = [headers.eq(0).attr('data-sortable'), that.activeSortOrder];
        }
        headers.css('cursor','pointer');
        preparePaginator(this);
        return this;
    };

    var initialize = (function(){
        $('[data-paginate-container]').each(function(key, item){
            var wrapper = $(item), alias = wrapper.data('paginate-alias');
            pagination[alias] = new Paginator(alias, wrapper);
        });
    }());

    return {
        initialize : function(selection) {
            selection.find('[data-paginate-container]').each(function(key, item){
                var wrapper = $(item), alias = wrapper.data('paginate-alias');
                pagination[alias] = new Paginator(alias, wrapper);
            });
        },
        refresh : function(alias, callback){
            pagination[alias].page = 1;
            pagination[alias].initialRun = true;
            pagination[alias].container.html('');
            pagination[alias].sourceURL = $("div[data-paginate-alias='"+alias+"']").attr('data-paginate-url');

            requestResults(pagination[alias], callback);
        },
        destroy : function(alias){

        },
        //replace refresh callback, or perform after?
        attachCallback : function(alias, callback) {
            pagination[alias].callback = callback;
        }
    }
}(jQuery));
