/**
 * script_IND_DJ.js  (robust against JSON‐rooted objects)
 * 
 * 1) Reads ?id= from the URL. 
 * 2) Fetches djs.json. 
 * 3) Looks inside either the top‐level array or a “djs” array within the JSON. 
 * 4) Finds the matching DJ object, populates the page, and then injects Mixcloud iframes.
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('📀 script_IND_DJ.js: DOMContentLoaded fired.');

  // 1) Get “id” param from URL:
  const params = new URLSearchParams(window.location.search);
  const djId = params.get('id');
  if (!djId) {
    document.querySelector('.profile-wrapper').innerHTML =
      '<p class="error">Unknown DJ ID. Please check your link.</p>';
    console.warn('⚠️ No ?id= parameter in URL.');
    return;
  }
  console.log(`📀 Found DJ ID: ${djId}`);

  // 2) Fetch DJ data from djs.json (make sure this path is correct).
  fetch('djs.json')
    .then((resp) => {
      console.log('📀 Fetch response status:', resp.status);
      if (!resp.ok) throw new Error(`Failed to load djs.json (status ${resp.status})`);
      return resp.json();
    })
    .then((rawData) => {
      // 3) Determine where the actual array lives:
      //    - If rawData is already an Array, use it.
      //    - Otherwise, look for rawData.djs (or change "djs" to whatever key your JSON uses).
      let allDJs;
      if (Array.isArray(rawData)) {
        allDJs = rawData;
      } else if (Array.isArray(rawData.djs)) {
        allDJs = rawData.djs;
      } else {
        console.warn('⚠️ Unexpected JSON structure—no top‐level array or “djs” array found.');
        allDJs = [];
      }

      // 4) Now find the single DJ whose “id” matches djId (as string):
      const dj = allDJs.find((item) => String(item.id) === String(djId));
      if (!dj) {
        document.querySelector('.profile-wrapper').innerHTML =
          '<p class="error">DJ not found. Please check the ID.</p>';
        console.warn(`⚠️ No DJ matching id="${djId}" in the JSON.`);
        return;
      }

      // 5) Populate the page with dj.name, dj.bio, artwork, socials, etc. ↓

      // a) Name & Bio
      document.getElementById('dj-name').textContent = dj.name || '—';
      const bioDiv = document.getElementById('dj-bio');
      bioDiv.innerHTML = dj.bio
        ? dj.bio
        : '<p>No biography available.</p>';

      // b) Artwork (use a placeholder if none)
      const artEl = document.getElementById('dj-artwork');
      if (dj.artworkUrl) {
        artEl.src = dj.artworkUrl;
      } else {
        artEl.src = 'https://i.imgur.com/qWOfxOS.png';
      }

      // c) Social links
      const socialList = document.getElementById('social-links');
      if (Array.isArray(dj.socials) && dj.socials.length) {
        dj.socials.forEach((soc) => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = soc.url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = soc.name;
          li.appendChild(a);
          socialList.appendChild(li);
        });
      } else {
        socialList.innerHTML = '<li>No socials available</li>';
      }

      // d) “Add to Calendar” button if nextEvent exists
      const calendarBtn = document.getElementById('calendar-btn');
      if (dj.nextEvent) {
        calendarBtn.disabled = false;
        calendarBtn.addEventListener('click', () => {
          const eventDate = new Date(dj.nextEvent);
          const calendarUrl = generateGoogleCalendarLink(
            dj.name + ' Live Set',
            eventDate,
            dj.profileUrl || window.location.href
          );
          window.open(calendarUrl, '_blank');
        });
      }

      // e) Mixcloud embeds
      if (Array.isArray(dj.mixes) && dj.mixes.length) {
        console.log('📀 Found mixes array for this DJ:', dj.mixes);
        dj.mixes.forEach((mixUrl) => {
          appendMixIframe(mixUrl);
        });
      } else {
        // If there are no mixes listed, show a placeholder message:
        const mixesContainer = document.getElementById('mixes-list');
        mixesContainer.innerHTML = '<p>No mixes available.</p>';
      }
    })
    .catch((err) => {
      console.error('❌ Error loading DJ data:', err);
      const wrapper = document.querySelector('.profile-wrapper');
      wrapper.innerHTML =
        '<p class="error">Error loading DJ profile. Please check the console for details.</p>';
    });


  /********** Helper to inject a Mixcloud <iframe loading="lazy"> **********/
  function appendMixIframe(mixUrl) {
    const mixesContainer = document.getElementById('mixes-list');
    const wrapper = document.createElement('div');
    wrapper.classList.add('mix-show');

    // Create the iframe with loading="lazy"
    const iframe = document.createElement('iframe');
    iframe.setAttribute('loading', 'lazy');

    // Turn a Mixcloud page URL into its embed URL form:
    if (mixUrl.endsWith('/')) {
      iframe.src = mixUrl.replace('mixcloud.com/', 'mixcloud.com/embed/') + 'light=1';
    } else {
      iframe.src = mixUrl + '/embed/?light=1';
    }

    // If it still doesn't look like an embed URL, bail and show error text:
    if (!iframe.src.includes('mixcloud.com/embed/')) {
      console.warn(`⚠️ Invalid Mixcloud URL: ${mixUrl}`);
      const errMsg = document.createElement('p');
      errMsg.textContent = 'Invalid mix URL.';
      wrapper.appendChild(errMsg);
      mixesContainer.appendChild(wrapper);
      return;
    }

    wrapper.appendChild(iframe);

    // Optional “Listen on Mixcloud” button below the iframe:
    const btn = document.createElement('button');
    btn.textContent = 'Listen on Mixcloud';
    btn.addEventListener('click', () => {
      window.open(mixUrl, '_blank');
    });
    wrapper.appendChild(btn);

    mixesContainer.appendChild(wrapper);
  }


  /********** Calendar‐link helper (unchanged) **********/
  function generateGoogleCalendarLink(title, dateObj, descriptionUrl) {
    const start = formatDateForGCal(dateObj);
    const endDate = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000);
    const end = formatDateForGCal(endDate);
    const text = encodeURIComponent(title);
    const details = encodeURIComponent(
      'Check out ' + title + ' on Cutters Choice Radio: ' + descriptionUrl
    );
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}%2F${end}&details=${details}`;
  }
  function formatDateForGCal(d) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const HH = String(d.getUTCHours()).padStart(2, '0');
    const MM = String(d.getUTCMinutes()).padStart(2, '0');
    const SS = String(d.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}T${HH}${MM}${SS}Z`;
  }
});
