import axios from 'axios';

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

export { getSettings, getInfos, postSettings, getGentle }