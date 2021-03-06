/**
 * @author Deux Huit Huit
 *
 */
(function ($, undefined) {
	
	'use strict';
	var win = $(window);
	var site = $('#site');
	var BUTTON_SELECTOR = '.js-change-state-hover';
	var BUTTON_STATE_ATTR = 'data-change-state-hover';
	var BUTTON_TARGET_ATTR = 'data-change-state-hover-target';

	var findTargetItemIfAvailable = function (item, target) {
		//Find target if present
		if (target) {
			return site.find(target);
		} else {
			return item;
		}
	};

	var mouseEnterLeave = function (e) {
		var t = $(this);

		var target = t.attr(BUTTON_TARGET_ATTR);
		var state = t.attr(BUTTON_STATE_ATTR);

		var item = t;

		//Valid needed info
		if (state) {

			item = findTargetItemIfAvailable(item, target);

			//Process item algo
			App.modules.notify('changeState.update', {
				item: item,
				state: state,
				action: 'toggle'
			});
		}

		return window.pd(e);
	};

	var init = function () {
		//Attach click handler
		site.on('mouseenter', BUTTON_SELECTOR, mouseEnterLeave);
		site.on('mouseleave', BUTTON_SELECTOR, mouseEnterLeave);
	};
	
	App.modules.exports('auto-change-state-on-hover', {
		init: init
	});
	
})(jQuery);
