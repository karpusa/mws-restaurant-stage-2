// Service Worker to sure to save things before all fetches happen
if ('serviceWorker' in navigator) {
	window.addEventListener('load', function () {
		navigator.serviceWorker.register('serviceworker.js').then(function (registration) {
			console.log('ServiceWorker registration successful with scope: ', registration.scope);
		}, function (err) {
			console.log('ServiceWorker registration failed: ', err);
		});
	});
}

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * IDB Integration
   */
  static createIDBStore(restaurants) {
    // Get specific IndexedDB version
    const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkiteIndexedDB || window.msIndexedDB || window.shimIndexedDB;

    // Open (or create) the database
    let idb = indexedDB.open("RestaurantDB", 1);

    // Create the schema
    idb.onupgradeneeded = function() {
      let db = idb.result;
      let store = db.createObjectStore("RestaurantStore", { keyPath: "id" });
      let index = store.createIndex("by-id", "id");
    };

    idb.onerror = function(err) {
      console.error(`IndexedDB error: ${err.target.errorCode}`);
    };

    idb.onsuccess = function() {
      // Start a new transaction
      let db = idb.result;
      let tx = db.transaction("RestaurantStore", "readwrite");
      let store = tx.objectStore("RestaurantStore");
      let index = store.index("by-id");

      // Add the restaurant data
      restaurants.forEach(restaurant => store.put(restaurant));

      tx.oncomplete = function() {
        db.close();
      };
    };
  }

  /**
   * Fetch data from IDB when offline
   */
  static getCachedData(callback) {
    let restaurants = [];

    // Get specific IndexedDB version
    const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkiteIndexedDB || window.msIndexedDB || window.shimIndexedDB;

    // Open (or create) the database
    let idb = indexedDB.open("RestaurantDB", 1);

    idb.onsuccess = function() {
      let db = idb.result;
      let tx = db.transaction("RestaurantStore", "readwrite");
      let store = tx.objectStore("RestaurantStore");
      let getData = store.getAll();

      getData.onsuccess = function() {
        callback(null, getData.result);
      };

      tx.oncomplete = function() {
        db.close();
      };
    };
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    if (navigator.onLine) {
      let xhr = new XMLHttpRequest();
      xhr.open('GET', DBHelper.DATABASE_URL);
      xhr.onload = () => {
        if (xhr.status === 200) { // Got a success response from server!
          const restaurants = JSON.parse(xhr.responseText);
          // Cache data
          DBHelper.createIDBStore(restaurants);
          callback(null, restaurants);
        } else { // Oops!. Got an error from server.
          const error = (`Request failed. Returned status of ${xhr.status}`);
          callback(error, null);
        }
      };
      xhr.send();
    } else {
      console.log(`No connection, fetching cached data`);
      DBHelper.getCachedData((error, restaurants) => {
        if(restaurants.length > 0) {
        callback(null, restaurants);
      }
    });
    }
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if(typeof restaurant.photograph === 'undefined') {
      return ('/dist/img/no_image.webp');
    }
    return (`/dist/img/${restaurant.photograph}.webp`);
  }

  /**
   * Image Lazy Loader
   */
  static lazyLoad() {
    if(typeof LazyLoad !== 'undefined') {
      new LazyLoad({
        elements_selector: '.restaurant-img'
      });
    }
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
