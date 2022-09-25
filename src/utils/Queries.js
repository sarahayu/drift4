import axios from 'axios';
import { parsePitch, pitchStats } from './MathUtils';

const getInfos = async ({ since }) => {
    const res = await axios.get(`/_rec/_infos.json?since=${ since }`);
    return res.data;
};

const getSettings = async () => {
    const res = await axios.post(`/_settings`, { get_settings: true });
    return res.data;
};

const postSettings = async ({ calcIntense, gentlePort }) => {
    const res = await axios.post(`/_settings`, { calc_intense: calcIntense, gentle_port: gentlePort });
    return res.data;
};

const getGentle = ({ gentlePort }) => {
    return fetch(`//localhost:${ gentlePort }`, { mode: 'no-cors' });
}

const getPitch = async pitchURL => {
    const res = await fetch(`/media/${ pitchURL }`);
    const tex = await res.text();

    let pitchArr = parsePitch(tex);
    return Promise.resolve(Object.assign(pitchArr, { 
        duration: pitchArr.length / 100 ,
        pitchStats: pitchStats(pitchArr),
    }));
}

const getAlign = async alignURL => {
    const res = await axios.get(`/media/${ alignURL }`);
    return res.data;
}

const getRMS = async rmsURL => {
    const res = await axios.get(`/media/${ rmsURL }`);
    return res.data;
}

const getMeasureSelection = async (docid, startTime, endTime) => {
    const res = await axios.get(`/_measure?id=${docid}&start_time=${startTime}&end_time=${endTime}`);
    return res.data.measure;
}

const getMeasureFullTS = async (docid, forceGen) => {
    if (forceGen === undefined)
        forceGen = false;
    const res = await axios.get(`/_measure?id=${docid}&force_gen=${forceGen}`);
    return res.data.measure;
}

const postDeleteDoc = async docid => {
    const res = await axios.post(`/_rec/_remove`, { id: docid });
    return res.data;
}

const postCreateDoc = async ({ title, size, date }) => {
    const res = await axios.post(`/_rec/_create`, { title, size, date });
    return res.data;
}

// use for path, transcript
const postUpdateDoc = async docObject => {
    const res = await axios.post(`/_rec/_update`, docObject);
    return res.data;
}

// TODO do all this trigger stuff serverside?

const postTriggerPitchCreation = async docid => {
    const res = await axios.post(`/_pitch`, { id: docid });
    return res.data;
}

const postTriggerRMSCreation = async docid => {
    const res = await axios.post(`/_rms`, { id: docid });
    return res.data;
}

const postTriggerHarvestCreation = async docid => {
    const res = await axios.post(`/_harvest`, { id: docid });
    return res.data;
}

const postTriggerAlignCreation = async docid => {
    const res = await axios.post(`/_align`, { id: docid });
    return res.data;
}

const postTriggerCSVCreation = async docid => {
    const res = await axios.post(`/_csv`, { id: docid });
    return res.data;
}

const postTriggerMatCreation = async docid => {
    const res = await axios.post(`/_mat`, { id: docid });
    return res.data;
}

export {
    getSettings,
    getInfos,
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
};
