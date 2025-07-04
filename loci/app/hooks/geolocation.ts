// utils/getIpAndLocation.ts
import type { NextRequest } from 'next/server';

export async function getIpAndLocation(req: NextRequest) {
  // Try multiple headers for IP detection
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  let ip = forwarded
    ? forwarded.split(',')[0].trim()
    : realIp || cfConnectingIp || null;

  console.log('IP detection:', { 
    forwarded, 
    realIp, 
    cfConnectingIp, 
    finalIp: ip 
  });

  // For localhost testing, use a fallback IP
  if (!ip || ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') {
    console.log('Using fallback IP for localhost testing');
    ip = '8.8.8.8'; // Google's public DNS as fallback for testing
  }

  if (!ip) {
    console.log('No IP detected, returning null location');
    return { ip: null, location: null };
  }

  try {
    console.log('Fetching location data for IP:', ip);
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    console.log('IP API response status:', res.status);
    
    if (!res.ok) {
      console.log('IP API response not ok, returning null location');
      return { ip, location: null };
    }

    const data = await res.json();
    console.log('IP API response data:', data);
    
    const location = {
      city: data.city,
      region: data.region,
      country: data.country_name,
      latitude: data.latitude,
      longitude: data.longitude,
      isp: data.org,
    };

    console.log('Processed location data:', location);
    return { ip, location };
  } catch (err) {
    console.error('Geo lookup error:', err);
    return { ip, location: null };
  }
}
