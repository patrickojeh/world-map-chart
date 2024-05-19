(function() {

  let mapData = [];

  const countries = document.querySelectorAll('path[name], path[class]');
  const svg = document.querySelector('.map-svg');

  /**
   * @typedef {Object} MapData
   * @param {string} name - The name of the country
   * @param {string} url - The url to the country's flag image
   * @param {number} count - The number of counts in the country
   */

  /**
   * Load data from the external map file
   * @returns {Promise<Array<MapData>>} - A promise that resolves to an array of MapData objects
   */
  async function loadData() {
    try {
      const request = await fetch('./data.json');

      if (!request.ok) {
        throw new Error('Failed to fetch map data');
      }

      const data = await request.json();

      return data;
    } catch(error) {
      throw new Error(error.message);
    }
  }

  /**
   * Populate the tooltip container
   * @param {string} name
   * @param {number} count
   * @param {string} flag
   * @param {string} label
   */
  const updateTooltipData = (name, count, flag, label) => {
    const title = document.querySelector('.map-tooltip #wmcName');
    const wmcCount = document.querySelector('.map-tooltip #wmcCount');
    const countryFlag = document.querySelector('.map-tooltip #wmcFlag');
    const wmcLabel = document.querySelector('.map-tooltip #wmcLabel');

    title.textContent = name;
    wmcCount.textContent = count;
    wmcLabel.textContent = label;
    countryFlag.src = flag;
  }

  /**
   * Clicking on a map pin
   * @returns {void}
   */
  const openTooltipHandler = function(e) {
    const country = this.getAttribute('data-name');
    const tooltip = document.querySelector('.map-tooltip');

    if (country === null) return;

    const match = mapData.find(countryData => {
      return countryData.name.toLowerCase() === country.toLowerCase();
    });

    if (!match) return;

    updateTooltipData(match.name, match.count, match.url, match.label)
    showAllHiddenPins();

    this.classList.add('hide');

    tooltip.classList.add('show');
    tooltip.style.left = `${e.pageX}px`;
    tooltip.style.top = `${e.pageY}px`;

    clearHighlightedMapArea();
  }

  const clearHighlightedMapArea = () => {
    [...countries].forEach(el => el.style.fill = 'inherit');
  }

  const showAllHiddenPins = () => {
    const mapPinsEl = document.querySelectorAll('.map-pin');

    [...mapPinsEl].forEach(el => el.classList.remove('hide'));
  }

  /**
   * Clicking outside of the map should close the map
   * @returns {void}
   */
  const closeTooltipHandler = ({ target }) => {

    if (Array.from(target.classList).includes('map-pin')) {
      return;
    }

    const tooltip = document.querySelector('.map-tooltip');

    tooltip.classList.remove('show');

    showAllHiddenPins();
    clearHighlightedMapArea();
  }

  /**
   * For countries with multiple locations on the map, return the largest location
   * @param {Array<object>} data - An array containing all countries data
   * @returns {Array<HTMLElement>} - Unique largest area of a country
   */
  const getLargestAreasByCountry = (data) => {
    const countries = {};
    const countryNamesInData = mapData.map(country => country.name.toLowerCase());

    Array.from(data).forEach(el => {
      const countryName = el.getAttribute('name');
      const countryNameByClass = el.getAttribute('class');

      const country = countryName ?? countryNameByClass;

      const { width: landAreaWidth } = el.getBoundingClientRect();

      if (!countryDataExists(country)) return;

      if (!Object.keys(countries).includes(country.toLowerCase())) {
        countries[country.toLowerCase()] = el;
      } else {
        const name = countryNamesInData.filter(countryItem => countryItem === country.toLowerCase())[0];

        if (name !== country.toLowerCase()) return;

        if (landAreaWidth > countries[name].getBoundingClientRect().width) {
          countries[name] = el;
        }
      }
    });

    return Object.values(countries);
  }

  /**
   * Place pin on largest area of a country
   * @param {Array<HTMLElement>} locations
   * @returns {void}
   */
  const mapPins = (locations) => {
    locations.map(el => {
      const ns = 'http://www.w3.org/2000/svg';

      const foreignObject = document.createElementNS(ns, 'foreignObject');
      const span = document.createElement('span');
      const countryName = el.getAttribute('name');
      const countryNameByClass = el.getAttribute('class');

      const {x, y, height, width} = el.getBBox();

      const attrOptions = {
        x: x + width/3,
        y: y + height/3,
        height: 24,
        width: 24
      }

      span.className = 'map-pin';

      const country = countryName ?? countryNameByClass;

      const [countryItem] = mapData.filter(dataItem => {
        return dataItem.name === country;
      });

      span.setAttribute('data-name', country);
      span.setAttribute('data-count', countryItem.count);

      span.addEventListener('click', openTooltipHandler);
      span.addEventListener('click', () => el.style.fill = '#bfc8d2');

      document.addEventListener('click', closeTooltipHandler);

      setForeignObjectAttributes(foreignObject, attrOptions);

      foreignObject.appendChild(span);

      svg.appendChild(foreignObject);
    });

    highlightTopThreePins();
  }

  const highlightTopThreePins = () => {
    const [high, higher, highest] = getTopThreeValues();

    const mapPinsEl = Array.from(document.querySelectorAll('.map-pin'));

    mapPinsEl.forEach(el => {
      const count = parseInt(el.getAttribute('data-count'));

      if (count === highest) el.classList.add('map-pin--highest');
      if (count === higher) el.classList.add('map-pin--higher');
      if (count === high) el.classList.add('map-pin--high');
    })
  }

  /**
   * Get top 3 values from the countries dataset
   * @returns {Array<number>}
   */
  const getTopThreeValues = () => {
    const sortedData = mapData.sort((a, b) => {
      if (a.count < b.count) return -1;
      if (a.count > b.count) return 1;
      return 0;
    });

    const sortedValues = sortedData.map(dataItem => {
      return dataItem.count;
    });

    const uniqueValues = [...new Set(sortedValues)];

    return uniqueValues.splice(uniqueValues.length - 3, 3);
  }

  /**
   *
   * @param {HTMLElement} el - The DOM element to set properties on
   * @param {Object} options - The attributes to set
   */
  const setForeignObjectAttributes = (el, options) => {
    for (let key in options) {
      el.setAttribute(key, options[key])
    }
  }

  /**
   * Check if a country exists in list of countries data
   * @param {string} country
   * @returns {boolean}
   */
  const countryDataExists = (country) => {
    const index = mapData.findIndex(item => {
      return item.name.toLowerCase() === country.toLowerCase();
    });

    return index >= 0;
  }

  /**
   * Initialize map logic
   * @returns {void}
   */
  const init = async () => {
    try {
      mapData = await loadData();

      const largestAreas = getLargestAreasByCountry(countries);

      mapPins(largestAreas);
    } catch(error) {
      throw new Error(error.message);
    }
  }

  init();
})();