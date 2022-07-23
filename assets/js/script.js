'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _typeDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

// Running Workout
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._typeDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// Cycling Workout
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._typeDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////////////////////////////
// ES6 Class Appication Architecture
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];

  constructor() {
    // Get user's location area
    this._getPosition();

    //Get Data from Local Storage
    this._getLocalStorage();

    //Log new Workout
    form.addEventListener('submit', this._newWorkout.bind(this));
    // Input Type toggling
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    // Workout List Handlers
    containerWorkouts.addEventListener('click', e => {
      const deleteElement = e.target.closest('.workout__delete');
      const workoutMother = e.target.closest('.workout');
      if (!deleteElement) this._moveToPopup(e);
      else {
        if (!workoutMother) return;
        this._deleteWorkout(workoutMother.dataset.id);
      }
    });
  }

  _getPosition() {
    //Geo-location Api
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your position`);
        }
      );
    }
  }

  _loadMap(position) {
    //Geo-location Api
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    console.log(coords.toString());
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';
    inputDistance.blur();

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    if (inputType.value) {
      // console.log('Working')
      inputElevation
        .closest('.form__row')
        .classList.toggle('form__row--hidden');
      inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }
  }

  _newWorkout(e) {
    e.preventDefault();

    // Get Data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const markCoords = [lat, lng];

    let workout;

    // Validate Data
    const validateInput = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const allPositive = (...inputs) => inputs.every(input => input > 0);

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence)
        !validateInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Distance should be a positive numbers');

      workout = new Running(markCoords, distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validateInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Distance should be a positive numbers');

      workout = new Cycling(markCoords, distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);
    console.log(this.#workouts);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on map as List
    this._renderWorkout(workout);

    // Clear field + Hide form
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const maker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    this.#markers.push(maker);
  }

  _renderWorkout(workout) {
    let injectHtml = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title"><span>${
        workout.description
      }</span> <span class="workout__edit">Edit</span><span class="workout__delete">DELETE</span></h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;

    if (workout.type === 'running') {
      injectHtml += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
    </li>
      `;
    }
    if (workout.type === 'cycling') {
      injectHtml += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
      </li>
      `;
    }

    form.insertAdjacentHTML('afterend', injectHtml);
  }

  _moveToPopup(e) {
    // e.preventDefault();

    const workoutEL = e.target.closest('.workout');

    if (!workoutEL) return;
    console.log(workoutEL);

    const workout = this.#workouts.find(
      work => work.id === workoutEL.dataset.id
    );
    console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // Workout.
    // workout.click();
  }

  _deleteWorkout(id) {
    const delEL = document.querySelector(`[data-id="${id}"]`);
    const delet = this.#workouts.forEach((work, i) => {
      if (work.id === id) {
        this.#workouts.splice(i, 1);

        this.#markers[i].remove();
        this.#markers.splice(i, 1);
      }
    });

    console.log(this.#workouts);
    delEL.remove();
    this._setLocalStorage();
  }

  _setLocalStorage() {
    // Local Storage API
    localStorage.setItem('workoutsData', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const workoutsData = JSON.parse(localStorage.getItem('workoutsData'));

    if (!workoutsData) return;

    this.#workouts = workoutsData;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  getWorkouts() {
    return console.log(this.#workouts);
  }
  getMarkers() {
    return console.log(this.#markers);
  }
  reset() {
    localStorage.removeItem('workoutsData');
    location.reload();
  }
}

const app = new App();
// app.reset();
