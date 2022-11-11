import { useEffect, useState } from "react";

function TimesTableCell({ editable, value, callback }) {

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

export default TimesTableCell;