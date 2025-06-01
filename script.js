/**
 * script_IND_DJ.js
 * Loads a single DJ’s profile (bio, socials, mixes) based on ?id=<djId>.
 * Ensures every Mixcloud <iframe> is created with loading="lazy".
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Determine DJ ID from query string (?id=).
  const params = new URLSearchParams(window.location.search);
  const djId = params.get('id');
  if (!djId) {
    document.querySelector('.profile-wrapper').innerHTML =
      '<p class="error">Unknown DJ. Please check the link.</p>';
    return;
  }

  // 2. Fetch DJ data from a local JSON (e.g. djs.json) or API endpoint.
  //    Example: GET /data/djs.json => { "djs": [ { "id": "dj123", ... }, ... ] }
  fetch('/data/djs.json')
    .then((resp) => {
      if (!resp.ok) throw new Error('Failed to load DJ data');
      return resp.json();
    })
    .then((data) => {
      const allDJs = data.djs || [];
      const dj = allDJs.find((d) => d.id === djId);
      if (!dj) {
        document.querySelector('.profile-wrapper').innerHTML =
          '<p class="error">DJ not found. Please check the link.</p>';
        return;
      }
      populateProfile(dj);
    })
    .catch((err) => {
      console.error(err);
      document.querySelector('.profile-wrapper').innerHTML =
        '<p class="error">Error loading DJ data. Please try again later.</p>';
    });

  // 3. Populate the page with DJ details, socials, and mixes.
  function populateProfile(dj) {
    // a) Insert DJ Name and Bio
    document.getElementById('dj-name').textContent = dj.name;
    document.getElementById('dj-bio').innerHTML = dj.bioHTML; 
    //    (Assumes dj.bioHTML is pre-sanitized HTML or plain text.)

    // b) Insert Artwork (if provided)
    if (dj.artworkUrl) {
      document.getElementById('dj-artwork').src = dj.artworkUrl;
    }

    // c) Build Social Links (if any)
    const socialList = document.getElementById('social-links');
    socialList.innerHTML = ''; // Clear any “Loading…” placeholder
    if (Array.isArray(dj.socials) && dj.socials.length) {
      dj.socials.forEach((soc) => {
        // Each soc object: { name: 'Facebook', url: 'https://facebook.com/…' }
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

    // d) Enable “Add to Calendar” only if an event timestamp is present
    const calendarBtn = document.getElementById('calendar-btn');
    if (dj.nextEvent && typeof dj.nextEvent === 'string') {
      calendarBtn.disabled = false;
      calendarBtn.addEventListener('click', () => {
        // Example: open Google Calendar link or create ICS file
        const eventDate = new Date(dj.nextEvent); // ISO format expected
        const calendarUrl = generateGoogleCalendarLink(
          dj.name + ' Live Set',
          eventDate,
          dj.profileUrl // link back to their DJ page
        );
        window.open(calendarUrl, '_blank');
      });
    }

    // e) Insert all existing Mixcloud mixes (array of URL strings)
    if (Array.isArray(dj.mixes) && dj.mixes.length) {
      dj.mixes.forEach((mixUrl) => {
        appendMixIframe(mixUrl);
      });
    } else {
      // If no mixes yet, you can show a “No mixes yet” message—or leave blank.
      const mixesContainer = document.getElementById('mixes-list');
      mixesContainer.innerHTML = '<p>No mixes available.</p>';
    }
  }

  // 4. Helper: create a Mixcloud <iframe> (with loading="lazy") + a “Play on Mixcloud” link
  function appendMixIframe(mixUrl) {
    const mixesContainer = document.getElementById('mixes-list');
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.classList.add('mix-show');
    // Create the <iframe>
    const iframe = document.createElement('iframe');
    iframe.setAttribute('loading', 'lazy'); // ← Critical for lazy-loading
    iframe.src = mixUrl.replace('/url/', '/embed/') + '/?light=1'; 
    //    (Assumes each mixUrl is the normal Mixcloud share link; adjust embed pattern if needed.)
    iframe.width = '100%';
    iframe.height = '60';
    iframe.frameBorder = '0';
    // Append iframe into wrapper
    wrapper.appendChild(iframe);

    // Create a “Listen on Mixcloud” button/link below
    const btn = document.createElement('button');
    btn.textContent = 'Listen on Mixcloud';
    btn.addEventListener('click', () => {
      window.open(mixUrl, '_blank');
    });
    wrapper.appendChild(btn);

    mixesContainer.appendChild(wrapper);
  }

  // 5. “Add Show” button handler: allow pasting a new Mixcloud URL at runtime
  document.getElementById('add-show-btn').addEventListener('click', () => {
    const input = document.getElementById('mixcloud-url-input');
    const newUrl = input.value.trim();
    if (!newUrl) {
      alert('Please paste a valid Mixcloud URL.');
      return;
    }
    // Optionally, validate it matches mixcloud.com/… pattern
    appendMixIframe(newUrl);
    input.value = '';
    // If you store new mixes server-side, you can send a POST here
  });

  // 6. Utility: generate a Google Calendar link for “Add to Calendar”
  function generateGoogleCalendarLink(title, dateObj, descriptionUrl) {
    // Using “single event” format: https://calendar.google.com/calendar/render?action=TEMPLATE
    const start = formatDateForGCal(dateObj);
    const endDate = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000); 
    // Assume 2-hour set duration; adjust as needed.
    const end = formatDateForGCal(endDate);
    const text = encodeURIComponent(title);
    const details = encodeURIComponent('Check out ' + title + ' on Cutters Choice Radio: ' + descriptionUrl);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}%2F${end}&details=${details}`;
  }
  function formatDateForGCal(d) {
    // Format to YYYYMMDDTHHMMSSZ (Google expects UTC)
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const HH = String(d.getUTCHours()).padStart(2, '0');
    const MM = String(d.getUTCMinutes()).padStart(2, '0');
    const SS = String(d.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}T${HH}${MM}${SS}Z`;
  }
});
