import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GutsContext } from 'context/GutsContext';
import { postSettings } from 'utils/Queries';
import { displaySnackbarAlert, RESOLVING } from 'utils/Utils';

function SettingsDialog(props) {

    const {
        calcIntense: globalCalcIntense,
        setCalcIntense: setGlobalCalcIntense,
        gentlePort: globalGentlePort,
        setGentlePort: setGlobalGentlePort,
    } = useContext(GutsContext);

    const queryClient = useQueryClient();

    const settingsDialogElem = useRef();

    // these are only for keeping track of form values, NOT global calcIntense and gentlePort
    const [ formCalcIntense, setFormCalcIntense ] = useState(RESOLVING);
    const [ formGentlePort, setFormGentlePort ] = useState(RESOLVING);

    const setNewSettings = ({ changed, gentle_port, calc_intense }) => {
        if (changed) {
            setGlobalCalcIntense(calc_intense);
            setGlobalGentlePort(gentle_port);

            // reload prosodic data, i.e. delete dynamism and others if changing 
            // from intense calc to non-intense, add them if vice versa
            queryClient.invalidateQueries(["prosodicMeasures"]);
            
            displaySnackbarAlert("Settings updated!");
        }
        // this should be unreachable
        else {
            console.log("ERROR: Settings not updated!")
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
        if (globalCalcIntense != formCalcIntense
                || globalGentlePort != formGentlePort)
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
        <div className="dialog-container accent-card">
            <div className="dialog-header">
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
        </div>
    );
}

export default SettingsDialog;