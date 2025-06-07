// script_IND_DJ.js
const API_KEY      = "pk_0b8abc6f834b444f949f727e88a728e0";
const BASE_URL     = "https://api.radiocult.fm/api";
const STATION_ID   = "cutters-choice-radio";
const MIXCLOUD_PW  = "cutters44";
const FALLBACK_ART = "https://i.imgur.com/qWOfxOS.png";

// Helpers
function showNotFound() {
  document.querySelector(".profile-wrapper").innerHTML = `
    <p style="color:white;text-align:center;margin:2rem;">
      Profile not found.
    </p>`;
}
function showError() {
  document.querySelector(".profile-wrapper").innerHTML = `
    <p style="color:white;text-align:center;margin:2rem;">
      Error loading profile.
    </p>`;
}
function createGoogleCalLink(title, s, e) {
  if (!s||!e) return "#";
  const fmt = dt=>new Date(dt).toISOString().replace(/-|:|\.\d{3}/g,'');
  return `https://www.google.com/calendar/render?action=TEMPLATE`
       + `&text=${encodeURIComponent(title)}`
       + `&dates=${fmt(s)}/${fmt(e)}`;
}

async function initPage() {
  const params   = new URLSearchParams(location.search);
  const artistId = params.get("id");
  if (!artistId) return showNotFound();

  // 1) Fetch artist
  let artist;
  try {
    const r = await fetch(
      `${BASE_URL}/station/${STATION_ID}/artists/${artistId}`,
      { headers: { "x-api-key": API_KEY } }
    );
    if (!r.ok) {
      if (r.status===404) return showNotFound();
      throw new Error(`Artist API ${r.status}`);
    }
    const body = await r.json();
    artist = body.artist || body.data || body;
    if (artist.attributes) artist = { ...artist, ...artist.attributes };
  } catch(err) {
    console.error(err);
    return showError();
  }

  // 2) Must have WEBSITE tag
  const tags = Array.isArray(artist.tags)
    ? artist.tags.map(t=>String(t).toLowerCase())
    : [];
  if (!tags.includes("website")) {
    return showNotFound();
  }

  // 3) Name
  document.getElementById("dj-name").textContent = artist.name || "";

  // 4) Bio/Description
  const bioEl = document.getElementById("dj-bio");
  let raw = null;
  for (const k of ["description","descriptionHtml","bio","bioHtml"]) {
    if (artist[k] != null) { raw = artist[k]; break; }
  }
  let bioHtml = "";
  if (raw) {
    if (typeof raw==="object" && Array.isArray(raw.content)) {
      const extract = node =>
        node.text ||
        (node.content||[]).map(extract).join("") ||
        "";
      bioHtml = raw.content.map(blk=>`<p>${extract(blk)}</p>`).join("");
    } else if (typeof raw==="string") {
      bioHtml = /<[a-z][\s\S]*>/i.test(raw)
        ? raw
        : raw.split(/\r?\n+/).map(p=>`<p>${p}</p>`).join("");
    }
  }
  bioEl.innerHTML = bioHtml || `<p>No bio available.</p>`;

  // 5) Artwork
  const art = document.getElementById("dj-artwork");
  art.src = artist.logo?.["512x512"]||artist.logo?.default||artist.avatar||FALLBACK_ART;
  art.alt = artist.name||"";

  // 6) Social links
  const sl = document.getElementById("social-links");
  sl.innerHTML = "";
  for (const [plat,url] of Object.entries(artist.socials||{})) {
    if (!url) continue;
    const label = plat.replace(/Handle$/,"").replace(/([A-Z])/g," $1").trim();
    const li = document.createElement("li");
    li.innerHTML = `<a href="${url}" target="_blank" rel="noopener">
      ${label.charAt(0).toUpperCase()+label.slice(1)}
    </a>`;
    sl.appendChild(li);
  }

  // 7) Add to Calendar button
  const calBtn = document.getElementById("calendar-btn");
  calBtn.disabled = true;
  calBtn.onclick  = null;
  try {
    const now     = new Date().toISOString();
    const inOneYr = new Date(Date.now()+365*24*60*60*1000).toISOString();
    const r2 = await fetch(
      `${BASE_URL}/station/${STATION_ID}/artists/${artistId}/schedule`
      + `?startDate=${now}&endDate=${inOneYr}`,
      { headers:{ "x-api-key": API_KEY } }
    );
    if (r2.ok) {
      const { schedules=[] } = await r2.json();
      if (schedules.length) {
        const { startDateUtc,endDateUtc } = schedules[0];
        calBtn.disabled = false;
        calBtn.onclick = () => {
          window.open(
            createGoogleCalLink(
              `DJ ${artist.name} Live Set`,
              startDateUtc,
              endDateUtc
            ), "_blank"
          );
        };
      }
    }
  } catch(err) {
    console.error("Schedule error:",err);
  }

  // 8) Mixcloud archive persistence (using your PHP endpoints)
  const listEl = document.getElementById("mixes-list");
  const addBtn = document.getElementById("add-show-btn");
  const input  = document.getElementById("mixcloud-url-input");

  // Load & display this DJ’s mixes
  async function loadShows() {
    listEl.innerHTML = "";
    let shows = [];
    try {
      // hit your PHP script (no caching)
      const res = await fetch(
        `/get_archives.php?artistId=${artistId}&_=${Date.now()}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(res.statusText);
      shows = await res.json();  // expect [{url,added}, …]
    } catch (e) {
      console.error("Couldn’t load archives:", e);
      listEl.textContent = "Couldn’t load shows.";
      return;
    }

    if (shows.length === 0) {
      listEl.textContent = "No mixes yet.";
      return;
    }

    shows.forEach(show => {
      const wrapper = document.createElement("div");
      wrapper.className = "mix-show";

      const iframe = document.createElement("iframe");
      Object.assign(iframe, {
        src: "https://www.mixcloud.com/widget/iframe/?" +
             "hide_cover=1&light=1&feed=" +
             encodeURIComponent(show.url),
        width: "100%",
        height: "60",
        frameBorder: "0",
        allow: "autoplay",
        loading: "lazy"
      });
      wrapper.appendChild(iframe);

      const btn = document.createElement("button");
      btn.textContent = "Remove show";
      btn.onclick = async () => {
        if (prompt("Enter password to remove this show:") !== MIXCLOUD_PW) {
          return alert("Incorrect password");
        }
        const form = new FormData();
        form.append("artistId", artistId);
        form.append("url", show.url);

        try {
          const r = await fetch("/delete_archive.php", {
            method: "POST",
            body: form
          });
          if (!r.ok) throw new Error(r.statusText);
          await loadShows();
        } catch (err) {
          console.error("Error removing show:", err);
          alert("Couldn’t remove. Try again later.");
        }
      };
      wrapper.appendChild(btn);

      listEl.appendChild(wrapper);
    });
  }

  // initial load
  loadShows();

  // Add-show handler
  addBtn.onclick = async () => {
    if (prompt("Enter password to add a show:") !== MIXCLOUD_PW) {
      return alert("Incorrect password");
    }
    const u = input.value.trim();
    if (!u) return;

    const form = new FormData();
    form.append("artistId", artistId);
    form.append("url", u);

    try {
      const r = await fetch("/add_archive.php", {
        method: "POST",
        body: form
      });
      if (!r.ok) throw new Error(r.statusText);
      input.value = "";
      await loadShows();
    } catch (err) {
      console.error("Error saving show:", err);
      alert("Couldn’t save. Try again later.");
    }
  };
}

window.addEventListener("DOMContentLoaded", initPage);
