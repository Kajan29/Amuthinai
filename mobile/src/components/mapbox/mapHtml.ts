/** Mapbox GL JS shell loaded inside a WebView. Token and layers arrive after load. */
export const MAPBOX_GL_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.css" rel="stylesheet" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #E4EFF5; }
    .mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right { transform: scale(0.85); transform-origin: bottom left; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = null;
    var ready = false;
    var queued = null;
    var suppressMove = false;

    function send(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    function zoomFromDelta(delta) {
      return Math.max(1, Math.min(18, Math.log2(360 / Math.max(delta || 0.04, 0.002))));
    }

    function circlePolygon(lng, lat, radiusMeters) {
      var points = [];
      var latRad = lat * Math.PI / 180;
      var dLat = radiusMeters / 110540;
      var dLng = radiusMeters / (111320 * Math.max(Math.cos(latRad), 0.01));
      for (var i = 0; i <= 32; i++) {
        var a = (2 * Math.PI * i) / 32;
        points.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
      }
      return [points];
    }

    function ensureSources() {
      if (!map.getSource('mb-markers')) {
        map.addSource('mb-markers', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'mb-markers',
          type: 'circle',
          source: 'mb-markers',
          paint: {
            'circle-radius': 8,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
        map.on('click', 'mb-markers', function (e) {
          if (!e.features || !e.features[0]) return;
          e.originalEvent.cancelBubble = true;
          send({ type: 'markerPress', id: e.features[0].properties.id });
        });
        map.on('mouseenter', 'mb-markers', function () { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'mb-markers', function () { map.getCanvas().style.cursor = ''; });
      }
      if (!map.getSource('mb-lines')) {
        map.addSource('mb-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'mb-lines',
          type: 'line',
          source: 'mb-lines',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'width'],
            'line-opacity': 0.9
          }
        });
      }
      if (!map.getSource('mb-circles')) {
        map.addSource('mb-circles', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'mb-circles-fill',
          type: 'fill',
          source: 'mb-circles',
          paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.22 }
        });
        map.addLayer({
          id: 'mb-circles-line',
          type: 'line',
          source: 'mb-circles',
          paint: { 'line-color': ['get', 'stroke'], 'line-width': 1.5 }
        });
      }
    }

    function applyState(payload) {
      if (!map || !ready) {
        queued = payload;
        return;
      }
      ensureSources();
      var markers = payload.markers || [];
      var lines = payload.polylines || [];
      var circles = payload.circles || [];

      map.getSource('mb-markers').setData({
        type: 'FeatureCollection',
        features: markers.map(function (m) {
          return {
            type: 'Feature',
            properties: { id: String(m.id), color: m.color || '#5A1626' },
            geometry: { type: 'Point', coordinates: [m.longitude, m.latitude] }
          };
        })
      });

      map.getSource('mb-lines').setData({
        type: 'FeatureCollection',
        features: lines.map(function (line, index) {
          return {
            type: 'Feature',
            properties: { id: String(line.id || index), color: line.strokeColor || '#5A1626', width: line.strokeWidth || 4 },
            geometry: {
              type: 'LineString',
              coordinates: (line.coordinates || []).map(function (c) { return [c.longitude, c.latitude]; })
            }
          };
        })
      });

      map.getSource('mb-circles').setData({
        type: 'FeatureCollection',
        features: circles.map(function (circle, index) {
          return {
            type: 'Feature',
            properties: {
              id: String(circle.id || index),
              fill: circle.fillColor || '#0F7B4F',
              stroke: circle.strokeColor || '#0F7B4F'
            },
            geometry: {
              type: 'Polygon',
              coordinates: circlePolygon(circle.longitude, circle.latitude, circle.radius || 200)
            }
          };
        })
      });
    }

    function currentRegion() {
      var c = map.getCenter();
      var b = map.getBounds();
      return {
        latitude: c.lat,
        longitude: c.lng,
        latitudeDelta: Math.abs(b.getNorth() - b.getSouth()),
        longitudeDelta: Math.abs(b.getEast() - b.getWest())
      };
    }

    window.__boot = function (payload) {
      if (!payload || !payload.token) {
        send({ type: 'error', message: 'missing-token' });
        return;
      }
      mapboxgl.accessToken = payload.token;
      if (map) {
        applyState(payload);
        return;
      }
      var region = payload.region || { latitude: 9.6645, longitude: 80.02, latitudeDelta: 0.08 };
      map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [region.longitude, region.latitude],
        zoom: zoomFromDelta(region.latitudeDelta),
        attributionControl: true
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', function () {
        ready = true;
        applyState(queued || payload);
        queued = null;
        send({ type: 'ready' });
      });
      map.on('error', function (e) {
        send({ type: 'error', message: (e && e.error && e.error.message) || 'map-error' });
      });
      map.on('click', function (e) {
        if (e.defaultPrevented) return;
        var features = map.queryRenderedFeatures(e.point, { layers: ['mb-markers'] });
        if (features && features.length) return;
        send({ type: 'press', latitude: e.lngLat.lat, longitude: e.lngLat.lng });
      });
      map.on('moveend', function () {
        if (suppressMove) {
          suppressMove = false;
          return;
        }
        send({ type: 'region', region: currentRegion() });
      });
    };

    window.__apply = function (payload) {
      applyState(payload);
    };

    window.__animateTo = function (region) {
      if (!map || !region) return;
      suppressMove = true;
      map.easeTo({
        center: [region.longitude, region.latitude],
        zoom: zoomFromDelta(region.latitudeDelta),
        duration: 450
      });
    };

    send({ type: 'html-ready' });
  </script>
</body>
</html>`;
