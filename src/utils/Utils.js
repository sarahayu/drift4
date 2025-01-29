import { getAlign, getPitch, getRMS, postGetWindowedData } from "./Queries";

/* ======== constants ========= */

const RESOLVING = null;

const ENTER_KEY = 13;

const LABEL_DESCRIPTIONS = {
    'WPM': 'The average number of words per minute. The transcript of the recording created by Gentle, corrected when necessary, produced the number of words read, which was divided by the length of the recording and normalized, if the recording was longer or shorter than one minute, to reflect the speaking rate for 60 seconds.',
    'Gentle_Pause_Count_>100ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
    'Gentle_Pause_Count_>500ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
    'Gentle_Pause_Count_>1000ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
    'Gentle_Pause_Count_>1500ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
    'Gentle_Pause_Count_>2000ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
    'Gentle_Pause_Count_>2500ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
    'Gentle_Long_Pause_Count_>3000ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
    'Gentle_Mean_Pause_Duration_(sec)': 'Average length of pauses',
    'Gentle_Pause_Rate_(pause/sec)': 'Average number of pauses greater than 100, 250 and 500 ms, normalized for recording length.',
    'Gentle_Complexity_All_Pauses': 'This measure is unitless, calculated using the Lempel-Ziv algorithm to estimate Kolomogorov complexity, also used for compression, as with gif or zip files. A higher value indicates less predictable & less repetitive pauses, normalized for audio length.',
    'Drift_f0_Mean_(hz)': 'Average Pitch. Mean f0, or the fundamental frequency, of a voice is sampled every 10 milliseconds, measured in Hertz (cycles per second), excluding outliers. This actually measures the number of times the vocal cords vibrate per second.',
    'Drift_f0_Range_95_Percent_(octaves)': 'Range of pitches measured in octaves, excluding outliers.',
    'Drift_f0_Mean_Abs_Velocity_(octaves/sec)': 'Speed of f0 in octaves per second. This is simply a measure of how fast pitch is changing.',
    'Drift_f0_Mean_Abs_Accel_(octaves/sec^2)': 'Acceleration of f0 in octaves per second squared. Acceleration is the rate of change of pitch velocity, that is how rapidly the changes in pitch change, which we perceive as the lilt of a voice.',
    'Drift_f0_Entropy': 'or entropy for f0, indicating the predictability of pitch patterns. Entropy is an information theoretic measure of predictability',
    'Intensity_Mean_Abs_Velocity_(decibels/sec)': 'Average speed of change of intensity/volume. Sound intensity or volume is measured in decibels (dB), a logarithmic unit of power that correlates with our subjective impression of loudness.',
    'Intensity_Mean_Abs_Accel_(decibels/sec^2)': 'Sound intensity or volume is measured in decibels (dB), a logarithmic unit of power that correlates with our subjective impression of loudness.',
    'Intensity_Segment_Range_95_Percent_(decibels)': 'Sound intensity or volume is measured in decibels (dB), a logarithmic unit of power that correlates with our subjective impression of loudness.',
    'Dynamism': 'how predictable or repetitive a speaker\'s pitch, or intonation, and rhythmic patterns are in combination.'
}

const LABEL_HEADERS = {
    'WPM': 'Words Per Minute',
    'Gentle_Pause_Count_>100ms': 'Pause Count',
    'Gentle_Pause_Count_>500ms': 'Pause Count',
    'Gentle_Pause_Count_>1000ms': 'Pause Count',
    'Gentle_Pause_Count_>1500ms': 'Pause Count',
    'Gentle_Pause_Count_>2000ms': 'Pause Count',
    'Gentle_Pause_Count_>2500ms': 'Pause Count',
    'Gentle_Long_Pause_Count_>3000ms': 'Pause Count',
    'Gentle_Mean_Pause_Duration_(sec)': 'Average Pause Duration',
    'Gentle_Pause_Rate_(pause/sec)': 'Average Pause Rate',
    'Gentle_Complexity_All_Pauses': 'Rhythmic Complexity All Pauses',
    'Drift_f0_Mean_(hz)': 'f0 Mean',
    'Drift_f0_Range_95_Percent_(octaves)': 'f0 Range',
    'Drift_f0_Mean_Abs_Velocity_(octaves/sec)': 'f0 Mean Absolute Velocity',
    'Drift_f0_Mean_Abs_Accel_(octaves/sec^2)': 'f0 Mean Absolute Acceleration',
    'Drift_f0_Entropy': 'f0 Entropy',
    'Intensity_Mean_Abs_Velocity_(decibels/sec)': 'Intensity Mean Absolute Velocity',
    'Intensity_Mean_Abs_Accel_(decibels/sec^2)': 'Intensity Mean Absolute Acceleration',
    'Intensity_Segment_Range_95_Percent_(decibels)': 'Intensity Segment Range',
    'Dynamism': 'Dynamism'
}

const WINDOWED_PARAMS = {
    'WPM': 20,
    'Gentle_Pause_Count_>100ms': 20,
    'Gentle_Pause_Count_>500ms': 20,
    'Gentle_Pause_Count_>1000ms': 20,
    'Gentle_Pause_Count_>1500ms': 20,
    'Gentle_Pause_Count_>2000ms': 20,
    'Gentle_Pause_Count_>2500ms': 20,
    'Gentle_Long_Pause_Count_>3000ms': 20,
    'Gentle_Mean_Pause_Duration_(sec)': 20,
    'Gentle_Pause_Rate_(pause/sec)': 20,
    'Gentle_Complexity_All_Pauses': 20,
    'Drift_f0_Mean_(hz)': 20,
    'Drift_f0_Range_95_Percent_(octaves)': 20,
    'Drift_f0_Mean_Abs_Velocity_(octaves/sec)': 20,
    'Drift_f0_Mean_Abs_Accel_(octaves/sec^2)': 20,
    'Drift_f0_Entropy': 20,
    'Intensity_Mean_Abs_Velocity_(decibels/sec)': 20,
    'Intensity_Mean_Abs_Accel_(decibels/sec^2)': 20,
    'Intensity_Segment_Range_95_Percent_(decibels)': 20,
    'Dynamism': 20,
}

/* ======== functions ========= */

function bytesToMB(bytes) {
    return Math.round(bytes / Math.pow(2, 20) * 100) / 100;
}

function elemClassAdd(id, className) {
    return document.getElementById(id).classList.add(className);
}

function elemClassRemove(id, className) {
    return document.getElementById(id).classList.remove(className);
}

function stopProp(ev) {
    return ev.stopPropagation();
}

function prevDef(ev) {
    return ev.preventDefault();
}

function prevDefStopProp(ev) {
    ev.stopPropagation();
    ev.preventDefault();
}

/**
 * stop propagation and prevent default wrapper
 */
function prevDefStopPropCb(cb) {
    return ev => {
        ev.stopPropagation();
        ev.preventDefault();
        cb();
    };
}

/**
 * prevent default wrapper
 */
function prevDefCb(cb) {
    return ev => {
        ev.preventDefault();
        cb();
    };
}

function stripExt(filename) {
    filename = filename.split(".").reverse();
    filename.shift();
    return filename.reverse().join("");
}

function getExt(filename) {
    return filename.split('.').reverse()[0];
}

function rearrangeObjectProps(obj, keys) {
    return keys.reduce((newObj, key) => {
        newObj[key] = obj[key];
        return newObj;
    }, {});
}

function includeDocInSelf(doc) {
    return ({ ...doc, 'docObject': doc });
}

function hasData(doc) {
    return doc && doc.pitch && doc.align && doc.rms;
}

function pitchQuery(id, path) {
    return ([['pitch', id], () => getPitch(path), { enabled: !!path }]);
}

function alignQuery(id, path) {
    return ([['align', id], () => getAlign(path), { enabled: !!path }]);
}

function rmsQuery(id, path) {
    return ([['rms', id], () => getRMS(path), { enabled: !!path }]);
}

function displaySnackbarAlert(message, milliseconds) {
    // eslint-disable-next-line no-undef
    showLittleAlert(message, milliseconds);
}

function linkFragment(url, text, id_alt) {
    return 'fragmentDirective' in document ? url + '#:~:text=' + escape(text).replaceAll('-', '%2D') : url + '#' + id_alt;
}

function filterStats(stats, keep_start_ends) {
    // take out pause counts that are not 100, 500, 1000, or 2000 and maybe start_time and end_time
    let keys = Object.keys(stats), start_ends = keys.splice(0, 2);

    keys = keys.filter(key => !key.startsWith('Gentle_Pause_Count') || ['100', '500', '1000', '2000'].find(pauseLen => key.includes('>' + pauseLen)));
    
    // sort keys so that WPM comes first, then Drift measures, then Gentle measures, and lastly Gentle Pause Count measures (and maybe start/end times)
    let pauseCounts = keys.splice(
        keys.findIndex(d => d.startsWith('Gentle_Pause_Count')), 
        keys.findIndex(d => d.includes('Gentle_Long_Pause_Count'))
    );
    let drifts = keys.splice(keys.findIndex(d => d.startsWith('Drift')));
    keys.splice(1, 0, ...drifts);
    keys.push(...pauseCounts);

    if (keep_start_ends)
        keys.push(...start_ends);

    // finally, remove these unneeded Voxit values
    let unneeded = [
        "f0_Mean",
        "f0_Entropy",
        "f0_Range_95_Percent",
        "f0_Mean_Abs_Velocity",
        "f0_Mean_Abs_Accel",
        "Intensity_Mean_(decibels)",
        "Complexity_Syllables",
        "Complexity_Phrases",
    ]

    keys = keys.filter(key => !unneeded.includes(key))

    return keys;
}

function splitString(str, len, maxlines) {
    let strs = [], i = 0, j = len;

    while (j < str.length && strs.length < maxlines - 1) {
        if (str.charAt(j) !== ' ') {
            j++;
            continue;
        }
        strs.push(str.substring(i, j));
        i = j + 1;
        j = i + len;
    }
    if (j >= str.length && strs.length < maxlines)
        strs.push(str.substring(i, j));
    else if (j != str.length)
        strs[strs.length - 1] += '...';

    return strs.join('\n');
}

function measuresToTabSepStr(fullTSProsMeasures, selectionProsMeasures) {
    let keys = filterStats(fullTSProsMeasures, true);
    
    let cliptxt = '\t';
    keys.forEach((key) => {
        cliptxt += key + '\t';
    });
    cliptxt += '\nfull clip\t';
    keys.forEach((key) => {
        cliptxt += fullTSProsMeasures[key] + '\t';
    });

    cliptxt += '\nselection\t';
    keys.forEach((key) => {
        cliptxt += selectionProsMeasures[key] + '\t';
    });
    cliptxt += '\n';

    return cliptxt;
}

function downloadVoxitCSV({ filenameBase, fullTSProsMeasuresReady, fullTSProsMeasures, selectionProsMeasuresReady, selectionProsMeasures }) {
    if (!fullTSProsMeasuresReady || !selectionProsMeasuresReady)
        return;

    let csvContent = measuresToTabSepStr(fullTSProsMeasures, selectionProsMeasures);
    csvContent = csvContent.replace(/\t/g, ',');

    // eslint-disable-next-line no-undef
    saveAs(new Blob([csvContent]), filenameBase + '-voxitcsv.csv');
};

async function downloadWindowedData({ filenameBase, id, fullTSProsMeasuresReady, fullTSProsMeasures }) {
    if (!fullTSProsMeasuresReady)
        return;

    displaySnackbarAlert(`Calculating... This might take a few minutes. DO NOT reload${
        process.env.REACT_APP_BUILD === "bundle" ? ' or change settings' : ''
    }!`, 4000);

    const { measure: measureJSON } = await postGetWindowedData({
        id: id,
        params: WINDOWED_PARAMS,
    });

    let maxSegments = -1;

    Object.values(measureJSON)
        .forEach(measures => maxSegments = Math.max(maxSegments, measures.length));

    let content = '';

    let header = 'measure_label,window_len,full_transcript';
    for (let i = 0; i < maxSegments; i++)
        header += `,seg_${i + 1}`;

    content += header;
    content += ",INFO: For the prosodic measure data the default window or audio sample length is 20 seconds. Rigorous testing showed that a window/audio sample of 20 seconds is ideal for its consistency in matching the prosodic measures of the entire audio length.";
    content += '\n';

    let filteredKeys = filterStats(fullTSProsMeasures);

    filteredKeys.forEach(label => {
        let measures = measureJSON[label];
        content += `${label},${WINDOWED_PARAMS[label]},${fullTSProsMeasures[label]}`;
        measures.forEach(measure => content += `,${measure}`);
        for (let i = 0; i < maxSegments - measures.length - 1; i++)
            content += ',';
        content += '\n';
    });

    // eslint-disable-next-line no-undef
    saveAs(new Blob([content]), filenameBase + '-windowed.csv');
};

// use for align and transcript
function downloadAllZipped(mediaTitle, docs) {
    // filter only those that have the content we need
    const hasMedia = Object.values(docs).filter(doc => doc[mediaTitle]);

    Promise.all(hasMedia.map(doc =>
        fetch('/media/' + doc[mediaTitle])
            .then(response => response.blob())
            .then(blob => ({ docid: doc.id, blob: blob }))
    )).then(blobdocs => {
        console.log('zipping...');
        // eslint-disable-next-line no-undef
        let zip = new JSZip();
        let folder = zip.folder(mediaTitle + 'files');
        blobdocs.forEach(({ docid, blob }) => {
            let doc = docs[docid];
            let filename = stripExt(doc.title);
            let filename_basic = filename + '-' + mediaTitle, 
                suffix = '.' + doc[mediaTitle].split('.')[1];
            let counter = 1;
            let out_filename = filename_basic;
            // append number to filename if file exists with the same name
            while (folder.file(out_filename + suffix)) 
                out_filename = filename_basic + `(${counter++})`;
            out_filename += suffix;
            folder.file(out_filename, new File([blob], out_filename, { type: 'text/plain' }));
        })
        // eslint-disable-next-line no-undef
        zip.generateAsync({ type: 'blob' }).then(content => saveAs(content, `${mediaTitle}files.zip`));
    }).catch(err => {
        displaySnackbarAlert("ERROR: Some content could not be loaded. Try disabling AdBlock", 5000);
        console.error("Some content could not be loaded, perhaps due to AdBlock.\n", err)
    })
}

function downloadAllDriftData(docs) {
    // filter only those that have the content we need
    const hasMedia = Object.values(docs).filter(doc => doc.csv);

    Promise.all(hasMedia.map(doc =>
        fetch('/media/' + doc.csv)
            .then(response => response.text())
            .then(textContent => ({ docid: doc.id, textContent: textContent }))
    )).then(blobdocs => {
        let cocatenated = '';
        blobdocs.forEach(({ docid, textContent }) => {
            let doc = docs[docid];
            cocatenated += `"${doc.title}"`;
            let numCommas = textContent.substring(0, textContent.indexOf('\n')).split(',').length - 1;
            for (let i = 0; i < numCommas; i++) cocatenated += ',';
            cocatenated += '\n';
            cocatenated += textContent;
        })

        // eslint-disable-next-line no-undef
        saveAs(new Blob([cocatenated]), 'driftcsvfiles.csv');
    }).catch(err => {
        displaySnackbarAlert("ERROR: Some content could not be loaded. Try disabling AdBlock", 5000);
        console.error("Some content could not be loaded, perhaps due to AdBlock.\n", err)
    })
}

// this doesn't rely on docs unlike downloadAllDriftData and downloadAllZipped
// because it's one of the newer functions in which I added serverside code for
// so... maybe do serverside for all downloadalls? 
async function downloadAllVoxitData() {

    let cocatenated = '';
    let keys;
    
    let response = await fetch('/_measure_all');
    let all_docs = await response.json();
    let first = true;

    for (let { title, measure } of Object.values(all_docs)) {
        if (first) {
            keys = filterStats(measure, true);
            cocatenated = ['audio_document',...keys].join(',') + '\n';
            first = false;
        }

        cocatenated += `"${ title }"` + ',';
        cocatenated += keys.map(key => measure[key]).join(',') + '\n';
    }
    
    // eslint-disable-next-line no-undef
    saveAs(new Blob([cocatenated]), 'voxitcsvfiles.csv');
}

function downloadGraph({ id, title, selection, size }) {
    let graphElement = document.getElementById(id + '-detdiv');

    // axis
    let svg1 = graphElement.children[0].cloneNode(true);
    // graph area
    let svg2 = graphElement.children[1].children[0].cloneNode(true);

    // scoot graph area to the right to leave room for axis
    svg2.setAttribute("x", svg1.width.baseVal.value);

    let svgWhole = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgWhole.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    
    let svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'), 
        svgStyle = document.createElementNS('http://www.w3.org/2000/svg', 'style');


    // font face doesn't work with typekit... yet
    // https://css-tricks.com/font-display-masses/#article-header-id-4
    // maybe someday :/ so I'll leave this here
    svgStyle.innerHTML = `

@font-face {
    font-family: futurafont;
    src: url('https://use.typekit.net/wlm4hlx.css');
}
svg#dl-svg 
{ 
    font-family: futurafont, 'Helvetica', 'Arial', sans-serif; 
    font-size: 14.4px; 
    background: white; 
}
`
    svgDefs.appendChild(svgStyle);
    svgWhole.insertBefore(svgDefs, svgWhole.firstElementChild)

    const svgWidth = svg1.width.baseVal.value + svg2.width.baseVal.value,
        svgHeight = svg2.height.baseVal.value;

    svgWhole.setAttribute("id", 'dl-svg');
    svgWhole.setAttribute("width", svgWidth);
    svgWhole.setAttribute("height", svgHeight);
    svgWhole.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svgWhole.appendChild(svg1);
    svgWhole.appendChild(svg2);
    let pitchLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    pitchLabel.textContent = 'log';
    pitchLabel.setAttribute('y', svgHeight - 50);
    pitchLabel.setAttribute('style', 'font-weight: 600;');
    let pitchLabel2 = pitchLabel.cloneNode(), pitchLabel3 = pitchLabel.cloneNode();
    pitchLabel2.textContent = 'pitch'
    pitchLabel2.setAttribute('dy', '1.1em');;
    pitchLabel3.textContent = '(hz)'
    pitchLabel3.setAttribute('dy', '2.2em');;
    let secondsLabel = pitchLabel.cloneNode();
    secondsLabel.textContent = 'seconds';
    secondsLabel.setAttribute('x', 50);
    secondsLabel.setAttribute('y', svgHeight - 20);
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
    const scaleUpFactor = size / svgHeight;
    let [width, height] = [svgWidth * scaleUpFactor, svgHeight * scaleUpFactor];

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

export {
    RESOLVING,
    ENTER_KEY,
    LABEL_DESCRIPTIONS,
    LABEL_HEADERS,
    WINDOWED_PARAMS,
    bytesToMB,
    elemClassAdd,
    elemClassRemove,
    stopProp,
    prevDef,
    prevDefStopProp,
    prevDefStopPropCb,
    prevDefCb,
    stripExt,
    getExt,
    rearrangeObjectProps,
    includeDocInSelf,
    hasData,
    pitchQuery,
    alignQuery,
    rmsQuery,
    displaySnackbarAlert,
    linkFragment,
    filterStats,
    splitString,
    measuresToTabSepStr,
    downloadVoxitCSV,
    downloadWindowedData,
    downloadAllZipped,
    downloadAllDriftData,
    downloadAllVoxitData,
    downloadGraph,
};