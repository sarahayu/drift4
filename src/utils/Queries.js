import axios from 'axios';
import { parsePitch, pitchStats } from './MathUtils';

async function getInfos({ since }) {
    const res = await axios.get(`/_rec/_infos.json?since=${ since }`);
    return res.data;
};

async function getSettings() {
    const res = await axios.post(`/_settings`, { get_settings: true });
    return res.data;
};

async function postSettings({ calcIntense, gentlePort }) {
    const res = await axios.post(`/_settings`, { calc_intense: calcIntense, gentle_port: gentlePort });
    return res.data;
};

function getGentle({ gentlePort }) {
    return fetch(`//localhost:${ gentlePort }`, { mode: 'no-cors' });
}

async function getPitch(pitchURL) {
    const res = await fetch(`/media/${ pitchURL }`);
    const tex = await res.text();

    let pitchArr = parsePitch(tex);
    return Promise.resolve(Object.assign(pitchArr, { 
        duration: pitchArr.length / 100 ,
        pitchStats: pitchStats(pitchArr),
    }));
}

async function getAlign(alignURL) {
    const res = await axios.get(`/media/${ alignURL }`);
    return res.data;
}

async function getRMS(rmsURL) {
    const res = await axios.get(`/media/${ rmsURL }`);
    return res.data;
}

async function getMeasureSelection(docid, startTime, endTime) {
    const res = await axios.get(`/_measure?id=${docid}&start_time=${startTime}&end_time=${endTime}`);
    return res.data.measure;
}

async function getMeasureFullTS(docid, forceGen) {
    if (forceGen === undefined)
        forceGen = false;
    const res = await axios.get(`/_measure?id=${docid}&force_gen=${forceGen}`);
    return res.data.measure;
}

async function postDeleteDoc(docid) {
    const res = await axios.post(`/_rec/_remove`, { id: docid });
    return res.data;
}

async function postCreateDoc({ title, size, date }) {
    const res = await axios.post(`/_rec/_create`, { title, size, date });
    return res.data;
}

// use for path, transcript
async function postUpdateDoc(docObject) {
    const res = await axios.post(`/_rec/_update`, docObject);
    return res.data;
}

// TODO do all this trigger stuff serverside?

async function postTriggerPitchCreation(docid) {
    const res = await axios.post(`/_pitch`, { id: docid });
    return res.data;
}

async function postTriggerRMSCreation(docid) {
    const res = await axios.post(`/_rms`, { id: docid });
    return res.data;
}

async function postTriggerHarvestCreation(docid) {
    const res = await axios.post(`/_harvest`, { id: docid });
    return res.data;
}

async function postTriggerAlignCreation(docid) {
    const res = await axios.post(`/_align`, { id: docid });
    return res.data;
}

async function postTriggerCSVCreation(docid) {
    const res = await axios.post(`/_csv`, { id: docid });
    return res.data;
}

async function postTriggerMatCreation(docid) {
    const res = await axios.post(`/_mat`, { id: docid });
    return res.data;
}

async function postGetWindowedData({ id, params }) {
    const res = await axios.post(`/_windowed`, { id, params });
    return res.data;
}

export {
    getInfos,
    getSettings,
    postSettings,
    getGentle,
    getPitch,
    getAlign,
    getRMS,
    getMeasureSelection,
    getMeasureFullTS,
    postDeleteDoc,
    postCreateDoc,
    postUpdateDoc,
    postTriggerPitchCreation,
    postTriggerRMSCreation,
    postTriggerHarvestCreation,
    postTriggerAlignCreation,
    postTriggerCSVCreation,
    postTriggerMatCreation,
    postGetWindowedData,
};
