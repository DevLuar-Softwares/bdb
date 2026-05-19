(function () {

  const urlParams = new URLSearchParams(window.location.search);
  const userUuid = 'a006f68a-067d-48c3-83d5-c59a5d7a9624';
  const pageview = 'https://track4you.app/api/v1/webhook/pageview';
  const click = 'https://track4you.app/api/v1/webhook/click';
  const event_id = crypto.randomUUID();
  let pixels = ["1202365885296360","1438218827812307"];

  if (Array.isArray(pixels) && pixels.length > 0) {
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)}
    ;if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');

    if (Array.isArray(pixels)) {
      pixels.forEach(pixel => {
        fbq('init', pixel);
        fbq('track', 'PageView');
      });
    }
  }

  let userLocation = null;
    function getCleanHostname() {
        const host = window.location.hostname;
        return host.startsWith("www.") ? host.slice(4) : host;
    }

  function sendPostback(url, payload) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch((error) => console.error('Erro ao enviar postback:', error));
  }

  function extractUTMsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let utms = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((param) => {
      if (urlParams.has(param)) {
        utms += `${param}=${urlParams.get(param)}&`;
      }
    });
    return utms.slice(0, -1);
  }

  function getFbpCookieWithRetry(retries = 3, delay = 200) {
    return new Promise((resolve) => {
      const tryGetFbp = (attempt) => {
        const fbp = getFbpCookie();
        if (fbp || attempt >= retries) {
          resolve(fbp);
        } else {
          setTimeout(() => tryGetFbp(attempt + 1), delay);
        }
      };
      tryGetFbp(0);
    });
  }

  function getFbpCookie() {
    return getCookie('_fbp');
  }

  function getFbcCookie() {
    return getCookie('_fbc');
  }

  function getCookie(name) {
    const nameEQ = `${name}=`;
    const decodedCookies = decodeURIComponent(document.cookie);
    const cookies = decodedCookies.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return cookie.substring(nameEQ.length);
      }
    }
    return null;
  }

  function createFbcCookieFromFbclid() {
    const fbclid = urlParams.get('fbclid');
    if (fbclid) {
      const fbcValue = `fb.1.${Date.now()}.${fbclid}`;
      document.cookie = `_fbc=${fbcValue}; path=/; domain=${window.location.hostname}; samesite=lax`;
    }
  }


async function fetchIPData() {
  if (userLocation) return userLocation;

  try {
    // Primeira tentativa com ipapi.co
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      return (userLocation = {
        ip: data.ip || '',
        city: data.city || '',
        region: data.region_code || '',
        country: data.country || '',
        zip: data.postal || '',
      });
    }
  } catch (error) {
    console.warn('Erro ao obter IP via ipapi.co:', error);
  }

  try {
    const ipResponse = await fetch('https://api64.ipify.org?format=json');
    if (!ipResponse.ok) throw new Error('Falha ao obter IP');

    const ipData = await ipResponse.json();
    const ip = ipData.ip;

    const detailsResponse = await fetch(`https://ipinfo.io/${ip}/json`);
    if (!detailsResponse.ok) throw new Error('Falha ao obter detalhes do IP');

    const detailsData = await detailsResponse.json();
    return (userLocation = {
      ip: ip || '',
      city: detailsData.city || '',
      region: detailsData.region || '',
      country: detailsData.country || '',
      zip: detailsData.postal || '',
    });
  } catch (error) {
    console.error('Erro ao obter IP via alternativa:', error);
  }

  return (userLocation = { ip: '', city: '', region: '', country: '', zip: '' });
}

  async function trackViewPage() {
    const location = await fetchIPData();
    createFbcCookieFromFbclid();
    const payload = {
      url: getCleanHostname(),
      path: window.location.pathname,
      utms: extractUTMsFromUrl(),
      ip: location.ip,
      user_agent: navigator.userAgent,
      location: location,
      fbp: getFbpCookie(),
      fbc: getFbcCookie(),
      action: 'viewpage',
      user_id: userUuid,
      event_id: event_id,
    };

    sendPostback(pageview, payload);
  }

  function trackButtonClick(event) {
    console.log('Clicou no botão:', event.target.id);

    getFbpCookieWithRetry().then((fbp) => {
      const payload = {
        url: getCleanHostname(),
        path: window.location.pathname,
        utms: extractUTMsFromUrl(),
        ip: userLocation ? userLocation.ip : '',
        user_agent: navigator.userAgent,
        location: userLocation,
        fbp: fbp,
        fbc: getFbcCookie(),
        action: 'click',
        buttonId: event.target.id,
        user_id: userUuid,
        event_id: event_id,
      };

      sendPostback(click, payload);
    });
  }

  trackViewPage();

  document.querySelectorAll('button, a[href]').forEach((button) => {
    button.addEventListener('click', trackButtonClick);
  });
})();
