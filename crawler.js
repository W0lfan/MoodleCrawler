function normalizeSpaces(str) {
    return str.replace(/\s+/g, ' ');
}

async function getFinalURL(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' }); // Using HEAD request to avoid downloading the content
      return response.url;  // This will return the final URL after all redirects
    } catch (error) {
      console.error('Error fetching the URL:', error);
    }
}

async function getFinalFileExtension(url) {
    try {
      // Fetch the final URL after redirects using a HEAD request
      const response = await fetch(url, { method: 'HEAD' });
      const finalUrl = response.url; // The final URL after redirects
      
      // Extract the file extension from the final URL
      const fileExtension = finalUrl.split('.').pop().split(/[#?]/)[0];  // Split at dot and remove any query or fragment
      return fileExtension;
    } catch (error) {
      console.error('Error fetching the URL:', error);
      return null;
    }
  }

const sections = document.querySelectorAll(".section-item");
const download = true;

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async function() {
    for (let section of sections) {
        const title = normalizeSpaces(section.querySelectorAll(".h4")[0].textContent);
        const links = section.querySelectorAll("a");
        console.log(`ANALYZING SECTION: ${title}`);
        
        // Prepare the text content for this section's file
        let sectionContent = `Section: ${title}\n\n`;
        
        for (let link of links) {
            console.log(`Found link: ${normalizeSpaces(link.textContent)}`);
            if (
                link.href.includes("https://moodle.univ-jfc.fr/mod/url/") ||
                link.href.includes("https://moodle.univ-jfc.fr/mod/resource/")
            ) {
                if (link.href.includes("https://moodle.univ-jfc.fr/mod/url/")) {
                    await fetch(link.href)
                        .then(response => response.text())
                        .then(async html => {
                            if (html.includes("urlworkaround")) {
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(html, 'text/html');
                                const workaroundLink = doc.querySelector('.urlworkaround a');
                                if (workaroundLink && download) {
                                    console.log(`Lien de ${link.textContent}`, workaroundLink.href);
                                    const blob = new Blob([workaroundLink.href], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${title}-${normalizeSpaces(link.textContent)}.txt`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                } else {
                                    console.log(`${title} | Lien de ${link.textContent}`, workaroundLink.href);
                                }
                            }
                        })
                        .catch(error => console.error('Error fetching the link:', error));
                } else {
                    await getFinalURL(link.href)
                    .then(async finalUrl => {
                        console.log(`${title} | Lien de ${link.textContent}`, finalUrl)
                        await fetch(finalUrl == link.href ? link.href : finalUrl)
                            .then(response => response.blob())
                            .then(async blob => {
                                await getFinalFileExtension(finalUrl).then(async fileExtension => {
                                    if (download) {
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.style.display = 'none';
                                        a.href = url;  // Use blob URL for downloading the file
                                        
                                        // Set the download attribute with section title and link text
                                        a.download = `${title}-${normalizeSpaces(link.textContent)}${
                                            fileExtension ? `.${fileExtension}` : ''
                                        }`;
                                        
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url); // Clean up blob URL
                                        document.body.removeChild(a);
                                    } else {
                                        console.log(`${title} | Lien de ${link.textContent}`, finalUrl);
                                    }
                                })
                            })
                            .catch(error => console.error('Error downloading the resource:', error));
                    })
                    .catch(error => console.error('Error:', error));
                }
                await delay(500); // Wait for 2 seconds before processing the next link
            }
        }
    }
})();
