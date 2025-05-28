export function formatUrlBrowserStyle(urlString: string): JSX.Element | string {
  const url = new URL(urlString);
  let displayHost = url.hostname;
  const port = url.port;
  const pathAndQuery = `${url.pathname === '/' && url.search ? '' : url.pathname}${url.search}${url.hash}`;
  const isDefaultPort = (url.protocol === 'http:' && port === '80') || (url.protocol === 'https:' && port === '443');

  return (
    <p className="text-offblack truncate">
      {displayHost}
      {port && !isDefaultPort && <span className="text-blue-300">:{port}</span>}
      {pathAndQuery && <span className="text-gray-400">{pathAndQuery}</span>}
    </p>
  );
}

export function formatUrlWithPageTitle(urlString: string, pageTitle: string): JSX.Element | string {
  const url = new URL(urlString);
  const displayHost = url.hostname;
  const port = url.port;

  const isDefaultPort = (url.protocol === 'http:' && port === '80') ||
    (url.protocol === 'https:' && port === '443');

  return (
    <p className="text-offblack truncate" title={`${urlString} - ${pageTitle}`}>
      {displayHost}
      {port && !isDefaultPort && <span className="text-blue-500">:{port}</span>}
      {pageTitle && <span className="text-gray-400"> / {pageTitle}</span>}
    </p>
  );
}

export function formatDuration(milliseconds: number): string {
  let totalSeconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  let remainingMilliseconds = milliseconds % 1000;
  let output = "";

  if (minutes > 0) {
    output += `${minutes} min `;
  }
  if (seconds > 0) {
    if (output == "") {
      output += `${seconds} seconds `;
    }
    else {
      output += `${seconds} sec `;
    }

  }
  if (remainingMilliseconds > 0 && (minutes <= 0 && seconds <= 0)) {
    output += `${remainingMilliseconds} ms`
  }

  return output.trim();
}