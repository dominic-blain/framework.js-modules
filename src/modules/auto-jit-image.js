/**
 *  @author Deux Huit Huit
 *
 *  Auto jit image
 */
(function ($, global, undefined) {
	
	'use strict';
	
	var firstTime = true;
	var site = $('#site');
	
	var onJitLoaded = function (args) {
		var t = $(args.target);
		
		if (t.hasClass('jit-image-bg-src')) {
			var bg = t.closest('.jit-image-bg');
			bg.css({
				backgroundImage: 'url(\'' + t.attr('src') + '\')'
			});
		}
	};

	var updateJitDimension = function (t) {
		var ctn = t.closest('.jit-image-bg');
		var ctnRatio = ctn.height() / Math.max(ctn.width(), 1);
		var ratio = t.attr('data-height') / Math.max(t.attr('data-width'), 1);
		var srcFormat = t.attr('data-src-format');
		var dimension = '$w';

		// Landscape or Square
		if (ctnRatio <= 1) {
			dimension = ratio < ctnRatio ? '$h' : '$w';
		// Portrait or else
		} else {
			dimension = ratio > ctnRatio ? '$w' : '$h';
		}

		// Check if dimension needs to change
		if (srcFormat.indexOf(dimension) === -1) {
			var newSrcFormat = '';
			if (dimension == '$w') {
				newSrcFormat = srcFormat.replace('0/$h', '$w/0');
			}
			else if (dimension == '$h') {
				newSrcFormat = srcFormat.replace('$w/0', '0/$h');
			}
			t.attr('data-src-format', newSrcFormat).jitImage();
		}
	};

	var processAllBgImages = function () {
		$(site).find('img[data-src-format].jit-image-bg-src').each(function (i, e) {
			var t = $(this);
			updateJitDimension(t);
		});
	};

	var onResize = function () {
		processAllBgImages();
	};

	var onArticleEnter = function (key, data) {
		if (!firstTime) {
			processAllBgImages();
			$(data.article).find('img[data-src-format]').jitImage();
		}
	};

	var onEnter = function (key, data) {
		if (!firstTime) {
			processAllBgImages();
			$(data.page.key()).find('img[data-src-format]').jitImage();
		}
		firstTime = false;
	};

	var loaded = function () {
		setTimeout(function () {
			processAllBgImages();
			$('#site img[data-src-format]').jitImage();
		}, 500);
	};

	var init = function () {
		site.on('loaded.jitImage', onJitLoaded);
	};

	var actions = function () {
		return {
			page: {
				enter: onEnter
			},
			site: {
				loaded: loaded,
				resize: onResize
			},
			articleChanger: {
				enter: onArticleEnter
			}
		};
	};
	
	var AutoJitImage = App.modules.exports('auto-jit-image', {
		init: init,
		actions: actions
	});
	
})(jQuery, window);
