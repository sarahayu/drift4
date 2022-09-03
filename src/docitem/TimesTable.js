import { useEffect, useState } from "react";
import { getTranscriptInfoFromAlign } from "../utils/MathUtils";
import { useProsodicData } from "../utils/Utils";

function TimesTable({ docObject, selection, setSelection, setRazorTime, resetRazor, audioLoaded }) {

    const {
        pitchReady,
        pitchData,
        alignReady,
        alignData,
    } = useProsodicData(docObject);

    if (!alignReady || !pitchReady || !audioLoaded) 
        return <UnloadedTimesTable columns={{
            'full recording duration*': 'N/A',
            'selection start': 'N/A',
            'selection end': 'N/A',
            'selection length': 'N/A',
        }}/>

    let [tsStart, tsEnd] = getTranscriptInfoFromAlign(alignData),
        tsDuration = tsEnd - tsStart,
        selStart = selection.start_time,
        selEnd = selection.end_time;

    let columns = {
        'full recording duration*': Math.round(tsDuration * 10) / 10 + 's',
        'selection start': Math.round(selStart * 10) / 10 + 's',
        'selection end': Math.round(selEnd * 10) / 10 + 's',
        'selection length': Math.round((selEnd - selStart) * 10) / 10 + 's'
    };

    let inputAreas = [1, 2];

    const checkRangeForError = (ind, value, otherValue) => {
        if ((!value && value != 0) || value < 0)
            return 'Time must be positive and non-null!';
        if ((ind == 1 && value >= otherValue) || (ind == 2 && value <= otherValue)) 
            return 'Invalid range!';
        if (Math.abs(value - otherValue) > 30 || Math.abs(value - otherValue) < 0.2) 
            return 'Range must be between 0.2s and 30s';

        return;
    }

    const updateTimeframe = (ev, ind) => {
        const [thisTime, otherTime] = ind == 1 ? ['start_time', 'end_time'] : ['end_time', 'start_time'];

        let value = parseFloat(ev.currentTarget.value);
        let otherValue = selection[otherTime];
        
        let error = checkRangeForError(ind, value, otherValue);
        
        let inputVal = ev.currentTarget.value;

        if (!error && selection[thisTime] != value) {            
            inputVal = Math.min(value, pitchData.duration);
            if (ind == 1)
                setSelection({
                    start_time: inputVal,
                    end_time: selection.end_time,
                });
            else
                setSelection({
                    start_time: selection.start_time,
                    end_time: inputVal,
                });
            resetRazor();
        }
        else if (error) {
            inputVal = selection[thisTime];
            alert(error);
        }

        inputVal = Math.round(inputVal * 10) / 10 + 's';

        return {
            inputVal,
            inputType: "text"
        };
    }

    const getHandleInputDone = ind => {
        return ev => updateTimeframe(ev, ind);
    }

    return (
        <div className="timeframe-wrapper">
            <table className="timeframe-table drift-table">
                <tr>{ Object.keys(columns).map(label => <th key={ label }>{ label }</th>) }</tr>
                <tr>
                    {
                        Object.values(columns).map((val, ind) =>
                            <TimesCell 
                                key={ ind }
                                editable={ inputAreas.includes(ind) } 
                                value={ val }
                                callback={ getHandleInputDone(ind) }/>
                        )
                    }
                </tr>
            </table>
        </div>
    )
}

function UnloadedTimesTable({ columns }) {
    return (
        <div className="timeframe-wrapper">
            <table className="timeframe-table drift-table">
                <tr>{ Object.keys(columns).map(label => <th key={ label }>{ label }</th>) }</tr>
                <tr>{ Object.values(columns).map((val, ind) => <td key={ ind }>{ val }</td>) }</tr>
            </table>
        </div>
    )
}

function TimesCell({ editable, value, callback }) {

    const [ curValue, setCurValue ] = useState(value);
    const [ curInputType, setCurInputType ] = useState("text");

    useEffect(() => {
        setCurValue(value);
    }, [ value ])
    
    if (!editable)
        return (
            <td>{ value }</td>
        )

    const handleFocus = ev => {
        if (curValue.slice(-1) === 's')
            setCurValue(curValue.slice(0, -1));
        setCurInputType("number");
    }

    const handleExit = ev => {
        const { inputVal, inputType } = callback(ev);

        setCurValue(inputVal);
        setCurInputType(inputType);
    }

    const handleValChange = ev => setCurValue(ev.currentTarget.value);

    const handleEnter = ev => {
        if (ev.keyCode == 13) {
            ev.preventDefault();
            ev.currentTarget.blur();
        }
    }

    return (
        <td className='editable'>
            <input 
                className='text-input'
                value={ curValue }
                type={ curInputType }
                step={ 0.1 }
                onFocus={ handleFocus }
                onBlur={ handleExit }
                onChange={ handleValChange }
                onKeyDown={ handleEnter }></input>
        </td>
    )

}

export default TimesTable;