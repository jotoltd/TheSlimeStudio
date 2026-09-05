"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/ad-tracking";

type AdSettings = {
  fb_pixel_id: string | null;
  fb_pixel_enabled: boolean;
  ga_measurement_id: string | null;
  ga_enabled: boolean;
  tiktok_pixel_id: string | null;
  tiktok_pixel_enabled: boolean;
  google_ads_id: string | null;
  google_ads_enabled: boolean;
  snapchat_pixel_id: string | null;
  snapchat_pixel_enabled: boolean;
};

let pixelsLoaded = false;

export default function AdPixels() {
  useEffect(() => {
    if (pixelsLoaded) return;
    pixelsLoaded = true;

    supabase
      .from("site_settings")
      .select("fb_pixel_id, fb_pixel_enabled, ga_measurement_id, ga_enabled, tiktok_pixel_id, tiktok_pixel_enabled, google_ads_id, google_ads_enabled, snapchat_pixel_id, snapchat_pixel_enabled")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const s = data as AdSettings;

        if (s.fb_pixel_enabled && s.fb_pixel_id) {
          injectFacebookPixel(s.fb_pixel_id);
        }
        if (s.ga_enabled && s.ga_measurement_id) {
          injectGoogleAnalytics(s.ga_measurement_id);
        }
        if (s.tiktok_pixel_enabled && s.tiktok_pixel_id) {
          injectTikTokPixel(s.tiktok_pixel_id);
        }
        if (s.google_ads_enabled && s.google_ads_id) {
          injectGoogleAds(s.google_ads_id);
        }
        if (s.snapchat_pixel_enabled && s.snapchat_pixel_id) {
          injectSnapchatPixel(s.snapchat_pixel_id);
        }

        trackEvent("PageView");
      });
  }, []);

  return null;
}

function injectFacebookPixel(pixelId: string) {
  if (typeof window === "undefined") return;
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any) {
    let n: any = (f as any).fbq || function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!(f as any).fbq) n = n || {};
    n.push = n; n.loaded = true; n.version = "2.0";
    n.queue = [];
    let t = b.createElement(e);
    t.async = true;
    t.src = v;
    let s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
    (f as any).fbq = n;
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  (window as any).fbq("init", pixelId);
  (window as any).fbq("track", "PageView");
  /* eslint-enable */
}

function injectGoogleAnalytics(measurementId: string) {
  if (typeof window === "undefined") return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;
  gtag("js", new Date());
  gtag("config", measurementId);
}

function injectTikTokPixel(pixelId: string) {
  if (typeof window === "undefined") return;
  /* eslint-disable */
  (function (w: any, d: any, t: string) {
    w.TiktokAnalyticsObject = t;
    let ttq: any = (w[t] = w[t] || []);
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
    ttq.setAndDefer = function (obj: any, method: string) {
      obj[method] = function () {
        obj.push([method].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (id: string) {
      let e = ttq._i[id] || [];
      for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
      return e;
    };
    ttq.load = function (e: string, n: string) {
      let i = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = i;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      let o = d.createElement("script");
      o.type = "text/javascript";
      o.async = true;
      o.src = i + "?sdkid=" + e + "&lib=" + t;
      let a = d.getElementsByTagName("script")[0];
      a.parentNode.insertBefore(o, a);
    };
    ttq.load(pixelId);
    ttq.page();
  })(window, document, "ttq");
  /* eslint-enable */
}

function injectGoogleAds(conversionId: string) {
  if (typeof window === "undefined") return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;
  gtag("js", new Date());
  gtag("config", conversionId);
}

function injectSnapchatPixel(pixelId: string) {
  if (typeof window === "undefined") return;
  /* eslint-disable */
  (function (e: any, t: any, n: string) {
    if (e.snaptr) return;
    let a: any = (e.snaptr = function () {
      a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments);
    });
    a.queue = [];
    let s = "script";
    let r = t.createElement(s);
    r.async = true;
    r.src = n;
    let u = t.getElementsByTagName(s)[0];
    u.parentNode.insertBefore(r, u);
  })(window, document, "https://sc-static.net/scevent.min.js");
  (window as any).snaptr("init", pixelId);
  (window as any).snaptr("track", "PAGE_VIEW");
  /* eslint-enable */
}
