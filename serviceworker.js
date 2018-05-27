self.addEventListener('install', function (event) {
	// Perform install steps
});

var CachedURLS = [
	'/',
	'index.html',
	'restaurant.html',
	'dist/css/styles.css',
	'data/restaurants.json',
	'dist/js/dbhelper.js',
	'dist/js/main.js',
	'dist/js/restaurant_info.js',
	'dist/img/1.webp',
	'dist/img/2.webp',
	'dist/img/3.webp',
	'dist/img/4.webp',
	'dist/img/5.webp',
	'dist/img/6.webp',
	'dist/img/7.webp',
	'dist/img/8.webp',
	'dist/img/9.webp',
	'dist/img/10.webp',
  'dist/img/no_image.webp'
];

self.addEventListener('install', function (event) {
	// Install service workers
	event.waitUntil(
		caches.open('restaurant-cache')
			.then(function (cache) {
				console.log('Opened cache');
				return cache.addAll(CachedURLS);
			})
	);
});

self.addEventListener('activate',  event => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
	event.respondWith(
	caches.match(event.request, {ignoreSearch:true}).then(response => {
		return response || fetch(event.request);
})
.catch(err => console.log(err, event.request))
);
});
