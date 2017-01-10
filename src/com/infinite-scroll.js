/**
 * @author Deux Huit Huit
 */

(function ($, win, undefined) {

	'use strict';

	App.components.exports('infinite-scroll', function (options) {
		var win = $(window);
		var scope;
		var ctn;
		var winH = win.height();
		
		var defaultOptions = {
			ctnSelector: '.js-infinite-scroll-ctn',
			contentCtnSelector: '.js-infinite-scroll-content',
			pagerLinkSelector: '.js-infinite-scroll-pager-link',
			triggerPercentage: 0.5,
			callback: $.noop
		};

		var o = $.extend({}, defaultOptions, options);

		var appendNextPage = function (dataLoaded, textStatus, jqXHR) {
			//Find a contentCtn
			var contentCtn = ctn.find(o.contentCtnSelector);
			var newContent = $(dataLoaded);

			//append new content
			if (!!contentCtn.length) {
				contentCtn.append(newContent.find(o.contentCtnSelector + ' > *'));
			} else {
				ctn.append(newContent.find(o.ctnSelector + ' > *'));
			}

			//Jit image
			ctn.find('img[data-src-format]').jitImage();
		};
		
		var loadNextPage = function (callback) {
			if (ctn.length) {
				var pagerLink = ctn.find(o.pagerLinkSelector);

				if (pagerLink.length) {
					var url = pagerLink.attr('href');

					//Remove Link
					pagerLink.remove();

					window.Loader.load({
						url: url,
						success: function (dataLoaded, textStatus, jqXHR) {
							appendNextPage(dataLoaded, textStatus, jqXHR);
							
							App.modules.notify('page.replaceState', {
								title: document.title,
								url: url
							});

							App.mediator.notify('infiniteScroll.pageLoaded', {
								data: dataLoaded,
								ctn: ctn,
								url: url
							});
							App.callback(callback, [ctn, url, dataLoaded, textStatus, jqXHR, o]);
						}
					});
				}
			}
		};

		var onResize = function () {
			winH = win.height();
		};
		
		var onScroll = function () {
			winH = win.height();
			if (ctn.length) {
				var y = win.scrollTop();
				
				var relY = Math.min(y - ctn.offset().top + winH);
				var relP = relY / ctn.height();

				if (relP >= o.triggerPercentage && relP <= 1) {
					loadNextPage(o.callback);
				}
			}
		};

		var loadNextPageEvent = function (key, data) {
			loadNextPage(data.callback);
		};

		var init = function (s, options) {
			o = $.extend(o, options);
			scope = s;
			ctn = scope.find(o.ctnSelector);
		};

		return {
			init: init,
			resize: onResize,
			scroll: onScroll,
			loadNextPage: loadNextPageEvent
		};
	});

})(jQuery, jQuery(window));
