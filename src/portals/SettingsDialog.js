import { useMutation } from '@tanstack/react-query';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GutsContext } from '../GutsContext';
import { postSettings } from '../utils/Queries';
import { RESOLVING } from '../utils/Utils';

function SettingsDialog(props) {

    const {
        calcIntense: globalCalcIntense,
        setCalcIntense: setGlobalCalcIntense,
        gentlePort: globalGentlePort,
        setGentlePort: setGlobalGentlePort,
    } = useContext(GutsContext);

    const settingsDialogElem = useRef();

    // these are only for keeping track of form values, NOT global calcIntense and gentlePort
    const [ formCalcIntense, setFormCalcIntense ] = useState(RESOLVING);
    const [ formGentlePort, setFormGentlePort ] = useState(RESOLVING);

    const setNewSettings = ({ changed, gentle_port, calc_intense }) => {
        if (changed) {
            setGlobalCalcIntense(calc_intense);
            setGlobalGentlePort(gentle_port);

            // TODO clear various query caches (align, measure, etc etc...) PROBABLY IN APP.JS???
            
            // eslint-disable-next-line no-undef
            little_alert("Settings updated!");
        }
        // it is possible settings did not get changed, maybe because /_settings endpoint isn't actually enabled to change settings (e.g. web version)
        else {
            console.log("Settings not updated!")
        }
    };

    const submitNewSettings = () => {
        mutation.reset();
        mutation.mutate({
            calcIntense: formCalcIntense,
            gentlePort: parseInt(formGentlePort),
        });
    }

    const hideDialog = () => settingsDialogElem.current.close();
    const submitDialog = () => {
        submitNewSettings();
        hideDialog();
    }

    // set up cog icon to display dialog on click
    useEffect(() => {
        settingsDialogElem.current = document.getElementById("settings-dialog");
        document.getElementById("settings-btn").onclick = () => settingsDialogElem.current.showModal();    
    }, []);

    // update form values to global values
    useEffect(() => {
        if (globalCalcIntense === RESOLVING || globalGentlePort === RESOLVING) 
            return;

        setFormCalcIntense(globalCalcIntense);
        setFormGentlePort(globalGentlePort);
    }, [globalCalcIntense, globalGentlePort]);

    const mutation = useMutation(postSettings, { onSuccess: setNewSettings });

    return createPortal(        
        <div className="settings-dia-container accent-card">
            <div className="settings-header">
                <h3>Local Drift Settings</h3>
                <button id="exit-settings-dialog" className="cancel-btn" onClick={ hideDialog }>&times;</button>
            </div>  
            <SettingsForm {...{ formCalcIntense, setFormCalcIntense, formGentlePort, setFormGentlePort }} />
            <button id="update-settings" className="basic-btn" onClick={ submitDialog }>update</button>
        </div>,
        document.getElementById('settings-dialog')
    );
}

function SettingsForm(props) {
    return  (
        (props.formCalcIntense === RESOLVING || props.formGentlePort === RESOLVING) ? "Loading..." :
        <div className="settings-main">   
            <label htmlFor="int-measures">Enable Intensive Measures</label>
            <input type="checkbox" name="int-measures" id="int-measures" checked={ props.formCalcIntense }
                onChange={ ev => props.setFormCalcIntense(ev.target.checked) } />
            <label htmlFor="gentle-port">Gentle Port*</label>
            <input type="number" name="gentle-port" id="gentle-port" className="text-input" value={ props.formGentlePort }
                onChange={ ev => props.setFormGentlePort(ev.target.value) } />
            <i className="g-span-2">*Unless you're running Windows and Docker, Gentle port shouldn't be changed</i>
        </div>
    );
}

export default SettingsDialog;