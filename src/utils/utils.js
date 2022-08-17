import { useQuery } from "@tanstack/react-query";
import { getAlign, getPitch, getRMS } from "./Queries";

const RESOLVING = null;
const ENTER_KEY = 13;

const bytesToMB = bytes => Math.round(bytes / Math.pow(2, 20) * 100) / 100;

const elemClassAdd = (id, className) => document.getElementById(id).classList.add(className);
const elemClassRemove = (id, className) => document.getElementById(id).classList.remove(className);

const stopProp = ev => ev.stopPropagation();
const prevDef = ev => ev.preventDefault();
const prevDefStopProp = ev => {
    ev.stopPropagation();
    ev.preventDefault();
}

const prevDefStopPropCb = cb => {
    return ev => {
        ev.stopPropagation();
        ev.preventDefault();
        cb();
    }
}

const prevDefCb = cb => {
    return ev => {
        ev.preventDefault();
        cb();
    }
}

const stripExt = filename => {
    filename = filename.split(".").reverse();
    filename.shift();
    return filename.reverse().join("");
}

const getExt = filename => filename.split('.').reverse()[0];

const rearrangeObjectProps = (obj, keys) => {
    return keys.reduce((newObj, key) => {
        newObj[key] = obj[key];
        return newObj;
    }, {});
}

const includeDocInSelf = doc => ({ ...doc, 'docObject': doc });

const hasData = doc => doc && doc.pitch && doc.align && doc.rms;

const pitchQuery = (id, path) => ([ ['pitch', id], () => getPitch(path), { enabled: !!path } ]);
const alignQuery = (id, path) => ([ ['align', id], () => getAlign(path), { enabled: !!path } ]);
const rmsQuery = (id, path) => ([ ['rms', id], () => getRMS(path), { enabled: !!path } ]);

export { RESOLVING, 
    ENTER_KEY, 
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
};