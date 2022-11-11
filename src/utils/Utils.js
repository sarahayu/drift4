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
    'Drift_f0_Range_(octaves)': 'Range of pitches measured in octaves, excluding outliers.',
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
    'Drift_f0_Range_(octaves)': 'f0 Range',
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
    'Drift_f0_Range_(octaves)': 20,
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

function prevDefStopPropCb(cb) {
    return ev => {
        ev.stopPropagation();
        ev.preventDefault();
        cb();
    };
}

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

    displaySnackbarAlert("Calculating... This might take a few minutes. DO NOT reload or change settings!", 4000);

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
};