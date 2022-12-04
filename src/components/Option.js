import React from 'react';
import { prevDefCb } from "utils/Utils";

function Option({ label, fn, link, filename, classes }) {
    return (
        <li>
            { fn && <button className={ classes } onClick={ prevDefCb(fn) }>{ label }</button> }
            { !fn && <a className={ classes } href={ link } target="_blank" download={ filename }>{ label }</a> }
        </li>
    )
}

export default Option;