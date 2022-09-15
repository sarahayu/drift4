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
    return axios.get(`//localhost:${ gentlePort }`);
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
};
