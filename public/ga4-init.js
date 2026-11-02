window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
// Never track the site owner: admin pages, and any browser where the admin
// account has signed in (flag set by GaRouteGuard). Must run before config,
// which sends the first page_view.
try {
  if (/^\/admin(\/|$)/.test(location.pathname) || localStorage.getItem('sw_ga_off') === '1') {
    window['ga-disable-G-QN9RSNBE21'] = true;
  }
} catch (e) {}
gtag('js', new Date());
gtag('config', 'G-QN9RSNBE21');
