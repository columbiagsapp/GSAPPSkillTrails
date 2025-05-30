/* eslint-disable */

import Airtable from 'airtable';

const tableID = "app1nwPhnOPNvChPK";
const AIRTABLE_PAT = process.env.VUE_APP_AIRTABLE_PAT; // We'll store this in environment variables
const base = new Airtable({ apiKey: AIRTABLE_PAT }).base(tableID);
const tableview = "Grid%20view";
const waypointApiUrl = `https://api.airtable.com/v0/${tableID}/Waypoint?api_key=${AIRTABLE_PAT}&view=${tableview}`;
const trailsApiUrl = `https://api.airtable.com/v0/${tableID}/Trails?api_key=${AIRTABLE_PAT}&view=${tableview}`;
const textApiUrl = `https://api.airtable.com/v0/${tableID}/Texts?api_key=${AIRTABLE_PAT}&view=${tableview}`;
const softwaresApiUrl = `https://api.airtable.com/v0/${tableID}/Softwares?api_key=${AIRTABLE_PAT}&view=${tableview}`;
const topicsApiUrl = `https://api.airtable.com/v0/${tableID}/Topics?api_key=${AIRTABLE_PAT}&view=${tableview}`;

var airtableApiUrls = {
	waypoint: `https://api.airtable.com/v0/${tableID}/Waypoint?api_key=${AIRTABLE_PAT}&view=${tableview}`,
	trails: `https://api.airtable.com/v0/${tableID}/Trails?api_key=${AIRTABLE_PAT}&view=${tableview}`,
	texts: `https://api.airtable.com/v0/${tableID}/Texts?api_key=${AIRTABLE_PAT}&view=${tableview}`,
	softwares: `https://api.airtable.com/v0/${tableID}/Softwares?api_key=${AIRTABLE_PAT}&view=${tableview}`,
	topics: `https://api.airtable.com/v0/${tableID}/Topics?api_key=${AIRTABLE_PAT}&view=${tableview}`
};

var proxyApiUrls = {
	waypoint: 'https://gsappskilltree-airtable-proxy.glitch.me/api/waypoint/list/0',
	trails: 'https://gsappskilltree-airtable-proxy.glitch.me/api/trails/list/0',
	texts: 'https://gsappskilltree-airtable-proxy.glitch.me/api/texts/list/0',
	softwares: 'https://gsappskilltree-airtable-proxy.glitch.me/api/softwares/list/0',
	topics: 'https://gsappskilltree-airtable-proxy.glitch.me/api/topics/list/0',
};


import Vue from "vue";
import Vuex from "vuex";
import createPersistedState from "vuex-persistedstate";

import dcopy from "deep-copy";

Vue.use(Vuex);

function coordinateTransform(val, sidelength) {
	if (isNaN(val)) {
		return 0;
	}
	// coordinates are from -1.0 to 1.0, remap to 0 to 2000
	// or 2000 x 2000px , based on sidelength
	return (val * sidelength) / 2 + sidelength / 2;
}

/*function coordinateDetransform(pxval, sidelength) {
  return (pxval * 2) / sidelength - 1;
}*/

function getAirtableRecords(table, callback) {
	base(table).select({
		view: "Grid view"
	}).all()
	.then(records => {
		callback(records);
	})
	.catch(err => {
		console.error('Error fetching from Airtable:', err);
	});
}

export default new Vuex.Store({
	plugins: [
		createPersistedState({
			key: "vuex",
			reducer(persistedState) {
				if (persistedState.clearState === true) {
					// return empty state when user logged out
					return {};
				}

				const stateFilter = Object.assign({}, persistedState);
				const blackList = [
					"hasLoaded",
					"hoveringTrails",
					"hoveringWaypoints",
					"route",
					"unfilteredWaypoints",
					"unfilteredTrails",
					"waypoints",
					"trails"
				];

				blackList.forEach(item => {
					delete stateFilter[item];
				});
				return stateFilter;
			}
		})
	],
	state: {
		count: 0,
		sidelength: 2000,
		hasLoaded: false,

		currentlyViewingWaypoint: null,
		currentlyViewingTrail: null,
		waypointsDraggable: false,

		waypoints: {},
		trails: [],
		softwares: {},
		topics: {},

		unfilteredWaypoints: {},
		unfilteredTrails: [],

		hoveringTrails: [],
		hoveringWaypoints: [],
		hoveringSoftware: null,
		hoveringTopic: null,

		texts: {},

		waypointStatusesToShow: ["Published"],
		trailStatusesToShow: ["Published"],

		displayGraphCommons: false,
		displayHowTo: true,

		cursorMode: {
			navigate: true,
			markasdone: false,
			zoomin: false,
			zoomout: false,
			hiking: false,
			hand: false
		},

		waypointsMarkedDone: [],

		isTouchDevice: false,

		clearState: false
	},
	getters: {
		trails(state) {
			return state.trails;
		},
		waypoints(state) {
			return state.waypoints;
		}
	},
	mutations: {
		setHoveringSoftware(state, payload) {
			state.hoveringSoftware = payload.id;
		},
		setHoveringTopic(state, payload) {
			state.hoveringTopic = payload.id;
		},
		setDisplayGraphCommons(state, payload) {
			state.displayGraphCommons = payload;
		},
		setDisplayHowTo(state, payload) {
			state.displayHowTo = payload;
		},
		clearPersistedState(state) {
			state.clearState = true;
		},
		setTouchDevice(state, payload) {
			state.isTouchDevice = payload;
		},
		setCursorMode(state, payload) {
			if (payload.mode in state.cursorMode) {
				Object.keys(state.cursorMode).forEach(k => {
					state.cursorMode[k] = false;
				});
				state.cursorMode[payload.mode] = true;
			}
		},
		setLoaded(state) {
			state.hasLoaded = true;
		},
		currentlyViewingWaypoint(state, payload) {
			state.currentlyViewingWaypoint = payload.id;
		},
		setCurrentlyViewingTrail(state, payload) {
			state.currentlyViewingTrail = payload.id;
		},
		addHoveringWaypoint(state, payload) {
			if (!state.hoveringWaypoints.includes(payload.id)) {
				state.hoveringWaypoints.push(payload.id);
			}
		},
		removeHoveringWaypoint(state, payload) {
			state.hoveringWaypoints = [];
			//    state.hoveringWaypoints = state.hoveringWaypoints.filter(v => v !== payload.id); // set to this if we want to support multiple waypoints
		},
		addHoveringTrails(state, payload) {
			payload.ids.forEach(function(id) {
				if (!state.hoveringTrails.includes(id)) {
					state.hoveringTrails.push(id);
				}
			});
		},
		removeHoveringTrails(state, payload) {
			payload.ids.forEach(function(id) {
				state.hoveringTrails = state.hoveringTrails.filter(v => v !== id);
			});
		},
		setWaypointsDraggable(state, val) {
			if (val == true) {
				state.waypointsDraggable = true;
			} else {
				state.waypointsDraggable = false;
			}
		},
		setTexts(state, t) {
			state.texts = t;
		},
		setUnfilteredWaypoints(state, wp) {
			state.unfilteredWaypoints = wp;
		},
		setUnfilteredTrails(state, tr) {
			state.unfilteredTrails = tr;
		},
		setWaypoints(state, wp) {
			state.waypoints = wp;
		},
		addWaypointMarkedDone(state, payload) {
			if (!state.waypointsMarkedDone.includes(payload.id)) {
				state.waypointsMarkedDone.push(payload.id);
			}
		},
		removeWaypointMarkedDone(state, payload) {
			state.waypointsMarkedDone = state.waypointsMarkedDone.filter(
				v => v !== payload.id
			);
		},
		setTrails(state, tr) {
			state.trails = tr;
		},
		setTopics(state, r) {
			state.topics = r;
		},
		setSoftwares(state, r) {
			state.softwares = r;
		},
		setWaypointStatusesToShow(state, wsts) {
			state.waypointStatusesToShow = wsts;
		},
		setTrailStatusesToShow(state, tsts) {
			state.trailStatusesToShow = tsts;
		},
		setWaypointCoordinates(state, payload) {
			var thiswp = state.waypoints[payload.waypointid];
			thiswp.fields.coordinateX = Math.max(
				0,
				Math.min(state.sidelength, payload.x)
			);
			thiswp.fields.coordinateY = Math.max(
				0,
				Math.min(state.sidelength, payload.y)
			);
		}
	},
	actions: {
		clearPersistedState({ state, commit }) {
			commit("clearPersistedState");
			location.reload();
		},
		toggleWaypointDone({ state, commit }, payload) {
			if (state.waypointsMarkedDone.includes(payload.id)) {
				commit("removeWaypointMarkedDone", { id: payload.id });
			} else {
				commit("addWaypointMarkedDone", { id: payload.id });
			}
		},
		fetch(context) {
			if (!context.state.hasLoaded) {
				context.dispatch("fetchWaypointsAndTrails");
			}
			context.dispatch("fetchText");
			context.dispatch("fetchSoftwaresAndTopics");
		},
		fetchText(context) {
			getAirtableRecords("texts", function(records) {
				var texts = records.filter(w => w.fields["Name"])
					.reduce(function(obj, item) {
						obj[item.fields.Name] = item;
						return obj;
					}, {});
				context.commit("setTexts", texts);
			});
		},
		fetchSoftwaresAndTopics(context) {
			getAirtableRecords("softwares", function(records) {
				var softwares = records
					.filter(w => w.fields["Name"])
					.reduce(function(obj, item) {
						obj[item.id] = item;
						return obj;
					}, {});
				context.commit("setSoftwares", softwares);
			});
			getAirtableRecords("topics", function(records) {
				var topics = records
					.filter(w => w.fields["Name"])
					.reduce(function(obj, item) {
						obj[item.id] = item;
						return obj;
					}, {});
				context.commit("setTopics", topics);
			});
		},
		fetchWaypointsAndTrails(context) {
			var successcount = 0;
			var num_of_requests = 2;

			getAirtableRecords("waypoint", function(records) {
				var waypoints = records.filter(
					w => w.fields["Name"]
				);

				waypoints.forEach(function(wp) {
					wp.fields.Trails = wp.fields.Trails || [];
				});

				// COORDINATE TRANSFORMATION LOGIC
				let transformedWaypoints = waypoints.reduce(function(obj, item) {
					item.fields.coordinateX = coordinateTransform(
						item.fields.coordinateX,
						context.state.sidelength
					);
					item.fields.coordinateY = coordinateTransform(
						item.fields.coordinateY,
						context.state.sidelength
					);
					obj[item.id] = item;
					return obj;
				}, {});

				context.commit("setUnfilteredWaypoints", transformedWaypoints);
				context.commit("setWaypoints", transformedWaypoints);

				if (++successcount >= num_of_requests) {
					context.dispatch("filterTrailsAndWaypoints", {
						trailStatusesToShow: context.state.trailStatusesToShow,
						waypointStatusesToShow: context.state.waypointStatusesToShow
					});
					context.commit("setLoaded");
				} // ugh seriously this is how we check for all get requests finishing?
			});

			getAirtableRecords("trails", function(records) {
				let trails = records.filter(
					t => t.fields["Name"]
				);

				// turn into object
				let processedTrails = trails
					.filter(function(tr) {
						return "Waypoints" in tr.fields;
					})
					.reduce(function(obj, item) {
						obj[item.id] = item;
						return obj;
					}, {});

				context.commit("setUnfilteredTrails", processedTrails);
				context.commit("setTrails", processedTrails);

				if (++successcount >= num_of_requests) {
					context.dispatch("filterTrailsAndWaypoints", {
						trailStatusesToShow: context.state.trailStatusesToShow,
						waypointStatusesToShow: context.state.waypointStatusesToShow
					});

					context.commit("setLoaded");
				} // ugh seriously this is how we check for all get requests finishing?
			});
		},
		filterTrailsAndWaypoints({ commit, state }, payload) {
			var result = {};

			var visibleWaypointIDs = Object.values(state.unfilteredWaypoints)
				.filter(thiswp => {
					return payload.waypointStatusesToShow.includes(thiswp.fields.Status);
				})
				.map(thiswp => thiswp.id);

			var visibleTrailIDs = Object.values(state.unfilteredTrails)
				.filter(thistr => {
					return payload.trailStatusesToShow.includes(thistr.fields.Status);
				})
				.map(thistr => thistr.id);

			var newUnfilteredWaypoints = dcopy(state.unfilteredWaypoints);
			// DEEP COPY NECESSARY otherwise reactivity gets fucked

			result.waypoints = Object.fromEntries(
				//1. filter waypoints if those waypoints don't have the right status
				Object.entries(newUnfilteredWaypoints)
					.filter(thiswp => {
						var [wpid, wpdata] = thiswp;
						return visibleWaypointIDs.includes(wpid);
					})
					//2. filter waypoints' trails if those trails aren't visible

					.map(thiswp => {
						var [wpid, wpdata] = thiswp;
						wpdata.fields.Trails = wpdata.fields.Trails.filter(thistr => {
							return visibleTrailIDs.includes(thistr);
						});
						return [wpid, wpdata];
					})
			);

			var newUnfilteredTrails = dcopy(state.unfilteredTrails);
			// DEEP COPY NECESSARY otherwise reactivity gets fucked
			//

			result.trails = Object.fromEntries(
				//1. filter trails if those trails don't have the right status

				Object.entries(newUnfilteredTrails)
					.filter(thistr => {
						var [trid, trdata] = thistr;
						return visibleTrailIDs.includes(trid);
					})

					// 1.5 filter trails if they don't have any waypoints!
					.filter(thistr => {
						var [trid, trdata] = thistr;
						return "Waypoints" in trdata.fields;
					})
					//2. filter trails' waypoints if those waypoints aren't visible
					.map(thistr => {
						var [trid, trdata] = thistr;

						trdata.fields.Waypoints = trdata.fields.Waypoints.filter(thiswp => {
							return visibleWaypointIDs.includes(thiswp);
						});
						return [trid, trdata];
					})
			);

			commit("setWaypoints", result.waypoints);
			commit("setTrails", result.trails);
			commit("setWaypointStatusesToShow", payload.waypointStatusesToShow);
			commit("setTrailStatusesToShow", payload.trailStatusesToShow);
		}
	}
});


