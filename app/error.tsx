"use client";
export default function Error({reset}:{error:Error;reset:()=>void}) {
 return <main className="narrow searchpage"><span className="eyebrow">REGISTRY UNAVAILABLE</span><h1>We couldn’t load this screen.</h1><p>The registry may be temporarily unavailable or need its database configured. No verification has been approved.</p><button className="primary" onClick={reset}>Try again</button></main>;
}
