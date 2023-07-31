import React, { useEffect, useRef, useState } from 'react';
import './mapStyles.css';

const MapContainer = () => {
  const mapRef = useRef(null);
  const searchBoxRef = useRef(null);
  const [waypoints, setWaypoints] = useState([]);
  const directionsRendererRef = useRef(null);
  const [totalDistance, setTotalDistance] = useState(0);

  useEffect(() => {
    function updateTotalDistance() {
      if (waypoints.length <= 1) {
        setTotalDistance(0);
        return;
      }
      let total = 0;

      for (let i = 1; i < waypoints.length; i++) {
        const startPoint = waypoints[i - 1].location;
        const endPoint = waypoints[i].location;
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(startPoint, endPoint);
        total += distance;
      }

      //format total distance to km/m
      const formattedTotal = total >= 1000 ? (total / 1000).toFixed(2) + ' km' : total.toFixed(2) + ' meters';
      setTotalDistance(formattedTotal);
    }

    const handleUndoClick = () => {
      if (waypoints.length > 0) {
        //create a copy of the waypoints array
        const updatedWaypoints = [...waypoints];
        //remove last waypoint from array
        updatedWaypoints.pop();

        if (updatedWaypoints.length >= 2) {
          //clear display
          directionsRendererRef.current.setDirections(null);

          const startPosition = updatedWaypoints[updatedWaypoints.length - 1].location;
          const endPosition = updatedWaypoints[updatedWaypoints.length - 2].location;
          const request = {
            origin: startPosition,
            destination: endPosition,
            travelMode: window.google.maps.TravelMode.WALKING,
            waypoints: updatedWaypoints.map((waypoint) => ({
              location: waypoint.location,
              stopover: true,
            })),
          };

          const directionsService = new window.google.maps.DirectionsService();
          directionsService.route(request, (response, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              directionsRendererRef.current.setDirections(response);
            }
            updateTotalDistance();
          });

          //update waypoints
          setWaypoints(updatedWaypoints);
        } else {
          //clear display if no waypoints, reset total & waypoints
          directionsRendererRef.current.setMap(null);
          setTotalDistance(0);
          setWaypoints([]);
        }
      }
    };
     
  
    //initialize map
    const mapOptions = {
      center: { lat: 37.8715, lng: -122.2730 },
      zoom: 14,
    };

    //create the map object
    const map = new window.google.maps.Map(mapRef.current, mapOptions);

    //search box
    const input = searchBoxRef.current;
    const searchBox = new window.google.maps.places.SearchBox(input);

    let bounds = new window.google.maps.LatLngBounds();

    //bias map towards bounds
    map.addListener("bounds_changed", () => {
      searchBox.setBounds(map.getBounds());
    });

    //wait until user clicks from drop down
    searchBox.addListener("places_changed", () => {
      const places = searchBox.getPlaces();

      if (places.length === 0) {
        return;
      }

      //reset bounds
      bounds = new window.google.maps.LatLngBounds();

      //for each place, add marker, change bounds
      places.forEach((place) => {
        if (!place.geometry || !place.geometry.location) {
          console.log("Returned place contains no geometry");
          return;
        }

        if (place.geometry.viewport) {
          bounds.union(place.geometry.viewport);
        } else {
          bounds.extend(place.geometry.location);
        }
      });
      map.fitBounds(bounds);

      //zoom to selected location
      if (places.length > 0) {
        if (places[0].geometry.viewport) {
          map.fitBounds(places[0].geometry.viewport);
        } else {
          map.setCenter(places[0].geometry.location);
          map.setZoom(17); // Adjust the zoom level as desired
        }
      }
    });

    //recenter the map
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const places = searchBox.getPlaces();
        if (places.length > 0) {
          map.setCenter(places[0].geometry.location);
          map.setZoom(17); // Adjust the zoom level as desired
        }
      }
    });

    //recenter when the user clicks 'enter'
    const enterButton = document.getElementById("enter-button");
    enterButton.addEventListener("click", () => {
      const places = searchBox.getPlaces();
      if (places.length > 0) {
        map.setCenter(places[0].geometry.location);
        map.setZoom(17);
      }
    });

    //click listener to map for points
    map.addListener("click", (event) => {
      //clicked location
      const clickedLocation = event.latLng;
      //position of start
      const startPosition = waypoints.length > 0 ? waypoints[waypoints.length - 1].location : null;
      if (startPosition) {
        //clear display if start is set
        directionsRendererRef.current.setDirections(null);
        //add the new location as a waypoint
        waypoints.push({
          location: clickedLocation,
          stopover: true,
        });

        //request directions
        const request = {
          origin: startPosition,
          destination: clickedLocation,
          travelMode: window.google.maps.TravelMode.WALKING,
          waypoints: waypoints,
        };
        //get route
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(request, (response, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            // Set the directions response to the DirectionsRenderer
            directionsRendererRef.current.setDirections(response);
          }
          updateTotalDistance();
        });
      } else {
        //start marker = click location
        waypoints.push({
          location: clickedLocation,
          stopover: true,
        });
      }
    });

    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map: map,
    });

    directionsRendererRef.current = directionsRenderer; //save for later use

    //add undo button listner
    const undoButton = document.getElementById("undo-button");
    undoButton.addEventListener("click", handleUndoClick);

    return () => {
      undoButton.removeEventListener("click", handleUndoClick);
    };
  }, [waypoints]);



  return (
    <div className="container">
      <h1>RDC - Route Distance Calculator</h1>
      <input type="text" id="location-search" placeholder="Search for a location" ref={searchBoxRef} />
      <button id="enter-button">Enter</button>
      <button id="undo-button">Undo</button>
      <div id="map" ref={mapRef}></div>
      <h2 id="total-distance">Total Distance: {totalDistance}</h2>
    </div>
  );
};

export default MapContainer;
