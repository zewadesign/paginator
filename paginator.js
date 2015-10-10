var zewa = zewa || Object.create(null);
zewa.paginator = (function($){
    //@TODO; add loader dynamically
    var pagination = [];

    var buildQueryURL = function(paginator) {

        var query, currentQueryString, localSearchData = paginator.searchObject.serialize();

        query = paginator.queryPrefix + 'Page=' + paginator.page
            + '&' + paginator.queryPrefix + 'Offset=' + paginator.offset;

        if(localSearchData !== false) {
            query += '&' + localSearchData;
        }

        currentQueryString = queryString.formatQueryString(paginator.sourceURL, query);

        return paginator.sourceURL + currentQueryString;

    };

    var togglePaginationControl = function(paginator) {

        if(paginator.page === 1) {
            paginator.previous.hide();
        } else {
            paginator.previous.show();
        }

        if(paginator.lastPage === true) {
            paginator.next.hide();
        } else {
            paginator.next.show();
        }

    }

    var renderResults = function(paginator, results) {

        if(results == "") {
            if(paginator.searchData === false) {
                paginator.lastPage = true;
            }
            if(paginator.page > 1) {
                paginator.page--;
            }
        } else {
            paginator.lastPage = false;
        }

        if(paginator.initialRun === true
            || paginator.type == 'traditional' && results !== ""
        ) {
            paginator.container.html('');
        }

        togglePaginationControl(paginator);

        paginator.container.append(results);
        paginator.initialRun = false;
    };

    var requestResults = function(paginator, callback, clear){
        if(paginator.active === false) {

            var activeURL = buildQueryURL(paginator);
            paginator.active = true;
            $.get(activeURL, function (response) {

                if(clear === true) {
                    paginator.container.html('');
                }

                paginator.active = false;
                renderResults(paginator, response.trim());
                paginator.previousResponse = response.trim();

                if (paginator.queue === true) {
                    requestResults(paginator, function () {
                        paginator.queue = false;
                        return callback;
                    }, clear);
                }

                if (typeof callback === 'function') {
                    callback();
                } // @TODO error handler, throw exception if not a function

            });

        }
    };

    var preparePaginatorSearch = function(paginator) {
        paginator.wrapper.on('change blur', '.paginated-search :input', function(e){
            //Set the page back to 1, since we're searching.
            paginator.page = 1;

            if(e.which !== undefined && e.which !== 0) {
                //return valid, but non-related keypresses
                if(e.which >= 90 && e.which <= 48 && e.which != 8 && e.which != 13) {
                    return;
                }
            }

            paginator.searchData = paginator.searchObject.serialize();
            paginator.searchData = false;
            $(paginator.searchObject).each(function(key, value){
                if($(value).val().trim() != "") {
                    paginator.searchData = true;
                }
            });

            if($('html, body').scrollTop() !== 0) {
                $('html, body').animate({scrollTop: 0}, 1000, function () {
                    requestResults(paginator, null, true);
                });
            } else {
                requestResults(paginator, null, true);
            }
        });
    }

    var prepareTraditionalPaginator = function(paginator) {
        paginator.buttons.removeClass('hide');
        paginator.wrapper.on('click', '.paginated-buttons a', function (e) {
            var that = $(this);
            paginator.direction = that.data('paginate-direction');

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

    var prepareInfinityPaginator = function(paginator) {
        var scrollableElement = document;
        var scrollableParent = window;

        if(paginator.wrapper.css('max-height') !== 'none') {
            scrollableElement = paginator.container;
            scrollableParent = paginator.wrapper;
        }

        $(scrollableParent).scroll(function (e) {
            var currentScroll = $(scrollableParent).scrollTop();
            if (currentScroll > paginator.position) {
                //@TODO document needs to change to be relative to parent element, will allow nested scrolling
                if (((currentScroll + paginator.touchy) + $(scrollableParent).height()) >= $(scrollableElement).height() && paginator.active === false) {
                    paginator.page++;
                    paginator.paging = true;
                    requestResults(paginator, function(){
                        paginator.paging = false;
                    });
                }
            }
            paginator.position = currentScroll;
        });
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

        preparePaginatorSearch(paginator);

        requestResults(paginator);
    };

    var Paginator = function(alias, wrapper) {
        this.wrapper = wrapper;
        this.container = wrapper.find('.paginated-container');
        this.sourceURL = wrapper.data('paginate-url');
        this.queryPrefix = wrapper.data('paginate-query-prefix');
        this.type = wrapper.data('paginate-type');
        this.touchy = wrapper.data('paginate-touchy');
        this.offset = wrapper.data('paginate-per-page');
        this.cache = wrapper.data('paginate-cache');
        this.pulse = wrapper.data('paginate-pulse');
        this.buttons = wrapper.find('.paginated-buttons');
        this.searchObject = wrapper.find('.paginated-search :input');
        this.next = wrapper.find('[data-paginate-direction="next"]');
        this.previous = wrapper.find('[data-paginate-direction="previous"]');
        this.alias = alias;
        this.paging = false;
        this.position = this.wrapper.scrollTop();
        this.searchData = false;
        this.active = false;
        this.queue = false;
        this.page = 1;
        this.lastPage = false;
        this.initialRun = true;

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
            pagination[alias].initialRun = true;
            requestResults(pagination[alias], callback);
        },
        destroy : function(alias){

        }
    }
}(jQuery));
