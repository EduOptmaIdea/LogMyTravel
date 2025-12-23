export type GeoFix = { latitude: number; longitude: number; accuracy?: number | null };

export async function getAccuratePosition(thresholdMeters = 50, maxWaitMs = 10000): Promise<GeoFix> {
  return new Promise<GeoFix>((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ latitude: -16.674, longitude: -49.262, accuracy: null });
      return;
    }
    let best: GeolocationPosition | null = null;
    const clear = (id?: number) => { if (id) navigator.geolocation.clearWatch(id); };
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : 9999;
        if (!best || acc < (best.coords.accuracy || 9999)) best = pos;
        if (acc <= thresholdMeters) {
          clear(watchId);
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: acc });
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: maxWaitMs, maximumAge: 0 }
    );
    setTimeout(() => {
      clear(watchId);
      const p = best?.coords;
      resolve({ latitude: p?.latitude ?? -16.674, longitude: p?.longitude ?? -49.262, accuracy: p?.accuracy ?? null });
    }, maxWaitMs);
  });
}
