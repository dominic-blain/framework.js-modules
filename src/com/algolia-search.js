/**
 * @author Deux Huit Huit
 *
 */

(function ($, win, undefined) {
	
	'use strict';
	
	App.components.exports('algolia-search', function (options) {
		var ctn;
		var aClient;
		var input;
		var resultsCtn;
		var rootUrl = document.location.protocol + '//' + document.location.host;
		var lg = $('html').attr('lang');
		var searchBarInput;
		var searchTaggingTimer = 0;
		
		var createResultsTemplatingObject = function (hit, opts) {
			var attribs = !opts.algoliaAttributesToRetrieve ?
				['url', 'title'] :
				opts.algoliaAttributesToRetrieve.split(',');
			return _.reduce(attribs, function (memo, k) {
				memo[k] = hit[k];
				if (!!memo[k] && k === 'url') {
					memo[k] = memo[k].replace(rootUrl, '');
				}
				return memo;
			}, {});
		};
		
		var defaultOptions = {
			inputSelector: '.js-algolia-input',
			resultsCtnSelector: '.js-algolia-results-ctn',
			resultsContentSelector: '.js-algolia-results-content',
			noResultsTemplateSelector: '.js-algolia-no-results-template',
			resultsItemTemplateSelector: '.js-algolia-results-item-template',
			algoliaAttributesToRetrieve: 'title,url,image',
			algoliaAttributesToHighlight: 'title',
			algoliaSearchableAttributes: [],
			resultsTemplateStringSelector: '.js-algolia-results-template-string',
			facetsAttr: 'data-algolia-facets',
			facetFiltersAttr: 'data-algolia-facet-filters',
			onCreateResultsTemplatingObject: createResultsTemplatingObject,
			defaultResultsTemplateString: '<div><a href="__url__">__title__</a></div>',
			defaultFacets: 'lang',
			defaultFacetFilters: 'lang:' + lg,
			defaultRecommandFacets: ['facet', 'lang'],
			defaultRecommandFacetFilters: ['facet:recommend', 'lang:' + lg],
			searchCallback: $.noop,
			recommendCallback: $.noop,
			errorCallback: $.noop,
			clearCallback: $.noop,
			beforeSearchCallback: $.noop,
			beforeAppendNewItem: $.noop,
			recommendResultsLimit: 5,
			gaCat: 'Search',
			gaAction: 'search',
			gaTimer: 1000,
			_templateSettings: {
				interpolate: /__(.+?)__/g,
				evaluate: /_%([\s\S]+?)%_/g,
				escape: /_%-([\s\S]+?)%_/g
			},
			algolia: {
				// DO NOT EDIT THOSE, set them on init
				app: '',
				key: '',
				index: ''
			},
			inputKeyUpCallback: null,
			showNoResultsWhenCleared: false
		};
		
		var o = $.extend({}, defaultOptions, options);

		var trackSearch = function (val, nb) {
			if (!o.gaCat) {
				return;
			}
			$.sendEvent(o.gaCat, o.gaAction, val, nb);
		};

		var appendNoResults = function (rCtn) {
			var resultContent = rCtn.find(o.resultsContentSelector);
			var noResults = !!rCtn.find(o.noResultsTemplateSelector).length ?
				rCtn.find(o.noResultsTemplateSelector).html() : '';
			resultContent.append(noResults);
		};
		
		var applyTemplate = function (rCtn, resultContent, content, val) {
			if (!!content.nbHits) {
				var tmplString = !!rCtn.find(o.resultsItemTemplateSelector).length ?
					rCtn.find(o.resultsItemTemplateSelector).text() :
					o.defaultResultsTemplateString;
				
				var originalSettings = _.templateSettings;
				_.templateSettings = o._templateSettings;
				
				tmplString = tmplString.replace(/ _and_ /g, ' && ');
				tmplString = tmplString.replace(/%5B/g, '[').replace(/%5D/g, ']');
				
				var tplt = _.template(tmplString);
				
				_.each(content.hits, function (t) {
					var cleanData = o.onCreateResultsTemplatingObject(t, o);
					var newItem = tplt(cleanData);
					App.callback(o.beforeAppendNewItem, [
						rCtn,
						resultContent,
						newItem,
						cleanData,
						t
					]);
					resultContent.append(newItem);
				});
				
				_.templateSettings = originalSettings;
			} else if (!!val && val.length > 2) {
				appendNoResults(rCtn);
			}
		};
		
		var errorCallback = function (rCtn, content, val, err) {
			var resultContent = rCtn.find(o.resultsContentSelector);
			
			resultContent.empty();
			
			App.callback(o.errorCallback, [rCtn, content, o, val, err]);
		};
		
		var searchCallback = function (rCtn, content, val, appendNewResults) {
			var resultContent = rCtn.find(o.resultsContentSelector);
			
			if (!appendNewResults) {
				resultContent.empty();
			}
			
			applyTemplate(rCtn, resultContent, content, val);
			clearTimeout(searchTaggingTimer);
			searchTaggingTimer = setTimeout(function () {
				trackSearch(val, !content ? 0 : (content.nbHits || 0));
			}, o.gaTimer);
			
			App.callback(o.searchCallback, [rCtn, content, o, val]);
		};

		var getQueriesOnly = function (queries) {
			return _.map(queries, function (q) {
				return q.query;
			});
		};

		var search = function (pageToRetrieve, appendNewResults) {
			var queries = [];
			var val = input.val();
			var p = parseInt(pageToRetrieve) || 0;
			var isMultipleWords = val.split(' ').length > 1;
			var query = isMultipleWords ? '"' + val + '"' : val;
			
			App.callback(o.beforeSearchCallback, [{
				resultsCtn: resultsCtn
			}]);
			
			resultsCtn.each(function () {
				var t = $(this);
				
				var facets = !!t.attr(o.facetsAttr) ?
					t.attr(o.facetsAttr).split(',') : o.defaultFacets;
				var facetFilters = !!t.attr(o.facetFiltersAttr) ?
					t.attr(o.facetFiltersAttr).split(',') : o.defaultFacetFilters;

				queries.push({
					scope: t,
					query: {
						indexName: o.algolia.index,
						query: query,
						page: p,
						advancedSyntax: isMultipleWords,
						params: {
							facets: facets,
							facetFilters: facetFilters,
							attributesToRetrieve: o.algoliaAttributesToRetrieve,
							attributesToHighlight: o.algoliaAttributesToHighlight,
							restrictSearchableAttributes: o.algoliaSearchableAttributes
						}
					}
				});
			});
			
			// Search all queries
			aClient.search(getQueriesOnly(queries), function (err, content) {
				if (!!err) {
					_.each(queries, function (query) {
						errorCallback(query.scope, content, val, err);
					});
					return;
				}
				_.each(content.results, function (results, i) {
					searchCallback(queries[i].scope, results, val);
				});
			});
		};

		var recommendCallback = function (rCtn, content, val) {
			var resultContent = rCtn.find(o.resultsContentSelector);
			resultContent.empty();
			applyTemplate(rCtn, resultContent, content, val);
			App.callback(o.recommendCallback, [resultContent, content, o, val]);
		};

		var recommend = function (terms, groupAttr) {
			var queries = [];
			
			if ((!terms || !terms.length) && App.debug()) {
				resultsCtn.prepend(
					$('<div />')
						.text('No recommend terms (categories) found. Defaults to all')
						.css({
							background: 'rgba(255, 100, 0, 0.6)',
							color: '#EEE',
							fontSize: '16px',
							padding: '10px',
							margin: '10px 0'
						})
				);
				terms = ['*'];
			} else if (App.debug()) {
				resultsCtn.prepend(
					$('<div />')
						.text('Search terms: ' + terms.join(', '))
						.css({
							background: 'rgba(0, 0, 250, 0.6)',
							color: '#EEE',
							fontSize: '16px',
							padding: '10px',
							margin: '10px 0'
						})
				);
			}
			
			// Create queries for each containers
			// TODO: remove terms and use data-attribute
			resultsCtn.each(function () {
				var t = $(this);
				
				var facets = !!t.attr(o.facetsAttr) ?
					t.attr(o.facetsAttr).split(',') :
					[].concat(o.defaultRecommandFacets);
				var facetFilters = !!t.attr(o.facetFiltersAttr) ?
					t.attr(o.facetFiltersAttr).split(',') :
					[].concat(o.defaultRecommandFacetFilters);
				var group = t.attr(groupAttr);
				
				if (!!group) {
					facets.push('recommendFacet');
					facetFilters.push('recommendFacet:' + group);
				}
				
				if (App.debug()) {
					t.prepend(
						$('<div />')
							.text(!group ?
								'Results not segmented' :
								'Results segmented by `' + group + '`'
							)
							.css({
								background: 'rgba(255, 200, 0, 0.6)',
								color: '#333',
								fontSize: '16px',
								padding: '10px',
								margin: '10px 0'
							})
					);
				}
				
				queries = queries.concat(_.map(terms, function (term, i) {
					return {
						scope: t,
						query: {
							indexName: o.algolia.index,
							query: term,
							customRanking: ['desc(rating.' + term + '.r)'],
							ranking: ['custom', 'typo'],
							params: {
								facets: facets,
								facetFilters: facetFilters,
								hitsPerPage: 10,
								typoTolerance: false,
								attributesToRetrieve: o.algoliaAttributesToRetrieve,
								attributesToHighlight: o.algoliaAttributesToHighlight,
								restrictSearchableAttributes: ['recommend']
							}
						}
					};
				}));
			});
			
			if (!queries || !queries.length) {
				if (!App.debug()) {
					ctn.remove();
				}
				return;
			}
			
			// Search all queries
			aClient.search(getQueriesOnly(queries), {
				strategy: 'stopIfEnoughMatches'
			}, function (err, content) {
				if (!!err) {
					resultsCtn.remove();
					_.each(queries, function (query) {
						errorCallback(query.scope, content, queries.join('+'), err);
					});
					return;
				}
				// Merge results
				resultsCtn.each(function () {
					var rCtn = $(this);
					// Keep only queries from this scope
					var filtered = _.reduce(content.results, function (memo, results, i) {
						if (queries[i].scope.is(rCtn)) {
							// Invert the results -> hits relationship
							memo = memo.concat(_.map(results.hits, function (hit) {
								hit.results = results;
								return hit;
							}));
							// Break the cycle
							delete results.hits;
						}
						return memo;
					}, []);
					// Group records by url
					var merged = _.reduce(filtered, function (memo, hit, i) {
						// Remove the current page
						if (document.location.toString().indexOf(hit.url) !== -1) {
							return memo;
						}
						if (!memo[hit.url]) {
							memo[hit.url] = [hit];
						} else {
							memo[hit.url].push(hit);
						}
						return memo;
					}, {});
					// Create a sum of the scores
					var summed = _.map(merged, function (result, i) {
						var r = result[0];
						r.computedRating = _.reduce(result, function (sum, r) {
							var index = r.results.query === '*' ? '_global' : r.results.query;
							if (!r.rating || !r.rating[index]) {
								return sum;
							}
							return sum + r.rating[index].r;
						}, 0);
						return r;
					});
					// Sort and limit
					var sorted = _.sortBy(summed, function (hit) {
						return -hit.computedRating;
					}).slice(0, o.recommendResultsLimit);
					// Fake algolia result
					var results = {
						nbHits: sorted.length,
						hits: sorted
					};
					recommendCallback(rCtn, results, terms);
					if (App.debug() && !results.nbHits) {
						rCtn.prepend(
							$('<div />')
								.text('No result found')
								.css({
									background: 'rgba(255, 0, 0, 0.6)',
									padding: '10px',
									margin: '10px 0',
									color: '#EEE',
									fontSize: '16px'
								})
						);
					}
				});
			});
		};

		var clear = function () {
			resultsCtn.each(function () {
				var resultContent = $(this).find(o.resultsContentSelector);
				resultContent.empty();
				
				if (!!o.showNoResultsWhenCleared) {
					appendNoResults($(this));
				}
			});
			App.callback(o.clearCallback, [resultsCtn, o]);
		};
		
		var onInputKeyUp = function () {
			var val = input.val();
		
			if (val.length > 2) {
				search();
			} else {
				clear();
			}
			
			App.callback(options.inputKeyUpCallback);
		};
		
		var init = function (c) {
			ctn = $(c);
			input = ctn.find(o.inputSelector);
			resultsCtn = ctn.find(o.resultsCtnSelector);
			
			// init algolia
			aClient = window.algoliasearch(o.algolia.app, o.algolia.key);
			input.on('keyup', onInputKeyUp);
		};
		
		return {
			init: init,
			search: search,
			recommend: recommend,
			updateInputVal: function (val) {
				input.val(val);
			},
			focus: function () {
				input.focus();
			},
			blur: function () {
				input.blur();
			},
			getVal: function () {
				return input.val();
			},
			clear: clear
		};
	});
	
})(jQuery, jQuery(window));
