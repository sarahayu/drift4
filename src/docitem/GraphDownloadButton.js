function GraphDownloadButton({ id, title, selection }) {

    const handleDownloadGraph = () => {
        let graphElement = document.getElementById(id + '-detdiv');
        let svg1 = graphElement.children[0].cloneNode(true), svg2 = graphElement.children[1].children[0].cloneNode(true);
        svg2.setAttribute("x", svg1.width.baseVal.value);
        let svgWhole = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgWhole.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svgWhole.setAttribute("style", `font-family: 'futura-pt', 'Helvetica', 'Arial', sans-serif; font-size: 14.4px; background: white;`);
        svgWhole.setAttribute("width", svg1.width.baseVal.value + svg2.width.baseVal.value);
        svgWhole.setAttribute("height", svg2.height.baseVal.value);
        svgWhole.appendChild(svg1);
        svgWhole.appendChild(svg2);
        let pitchLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        pitchLabel.textContent = 'log';
        pitchLabel.setAttribute('y', svg2.height.baseVal.value - 50);
        pitchLabel.setAttribute('style', 'font-weight: 600;');
        let pitchLabel2 = pitchLabel.cloneNode(), pitchLabel3 = pitchLabel.cloneNode();
        pitchLabel2.textContent = 'pitch'
        pitchLabel2.setAttribute('dy', '1.1em');;
        pitchLabel3.textContent = '(hz)'
        pitchLabel3.setAttribute('dy', '2.2em');;
        let secondsLabel = pitchLabel.cloneNode();
        secondsLabel.textContent = 'seconds';
        secondsLabel.setAttribute('x', 50);
        secondsLabel.setAttribute('y', svg2.height.baseVal.value - 20);
        svgWhole.appendChild(pitchLabel);
        svgWhole.appendChild(pitchLabel2);
        svgWhole.appendChild(pitchLabel3);
        svgWhole.appendChild(secondsLabel);
        let razor = svgWhole.getElementsByClassName("graph-razor")[0];
        if (razor) razor.remove();
    
        // https://stackoverflow.com/questions/23218174/how-do-i-save-export-an-svg-file-after-creating-an-svg-with-d3-js-ie-safari-an
        // https://stackoverflow.com/questions/3975499/convert-svg-to-image-jpeg-png-etc-in-the-browser
        let svgBlob = new Blob([svgWhole.outerHTML], { type: "image/svg+xml" });
        let svgUrl = URL.createObjectURL(svgBlob);
        let img = new Image();
        let canvas = document.createElement('canvas');
        let [width, height] = [svg1.width.baseVal.value + svg2.width.baseVal.value, svg2.height.baseVal.value];
        width *= 1.5; height *= 1.5;
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        img.onload = function () {
            ctx.drawImage(img, 0, 0, width, height);
    
            let filename = title.split('.').reverse();
            filename.shift();
            let { start_time, end_time } = selection;
            start_time = Math.round(start_time * 100000) / 100000;
            end_time = Math.round(end_time * 100000) / 100000;
            filename = filename.reverse().join('') + '.' + start_time + '-' + end_time + '.png';
            // eslint-disable-next-line no-undef
            canvas.toBlob(canvasBlob => saveAs(canvasBlob, filename));
        }
    
        img.src = svgUrl;
    }

    return (
        <button className="dl-graph-btn" onClick={ handleDownloadGraph }>
            <span>Download Graph</span>
            <img src="download-icon.svg"/>
        </button>
    );
}

export default GraphDownloadButton;