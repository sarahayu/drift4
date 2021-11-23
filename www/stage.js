var T = T || {};
var D = D || {};		// Data
var C = C || {
    STATUS: {
        UNINITIALIZED: 'uninitialized',
        LOADING: 'loading',
        READY: 'ready',
        ERROR: 'error'
    }
};

var DRIFT_VER = 'v4.0';

// "main" method
// this function (along with the rest of this file) is run each time stage.js is saved / when the webpage is first loaded
(function main() {

    T.XSCALE = 300;
    T.PITCH_H = 250;
    T.LPAD = 0;
    T.MAX_A = 15;
    T.DESCRIPTIONS = get_descriptions();

    // initialize global variables, making sure to only initialize them
    // when the page first loads and not everytime this file is saved
    if (!T.docs) {
        T.docs = {};
        reload_docs();
    }
    if (!T.active) {
        T.active = {};
    }
    if (!T.opened) {
        T.opened = {};
    }
    if (!T.razors) {
        T.razors = {};
    }
    if (!T.selections) {
        T.selections = {};
    }
    if (!T.ticking) {
        T.ticking = true;
        tick();
    }

    document.getElementById("version").textContent = DRIFT_VER;

    register_listeners();
    check_gentle();
    render();
})()

function reload_docs() {
    T.LAST_T = T.LAST_T || 0;
    let firsttime = !T.LAST_T;

    FARM.get_json("/_rec/_infos.json?since=" + T.LAST_T, (ret) => {
        ret.forEach((doc) => {
            if (T.docs[doc.id])
                Object.assign(T.docs[doc.id], doc);
            else
                T.docs[doc.id] = doc;
            T.LAST_T = Math.max(T.LAST_T, doc.modified_time);
        });
        render();

        window.setTimeout(reload_docs, 3000);
    });
}

function tick() {
    // reached the end of audio
    if (T.audio && T.audio.paused && T.audio.currentTime == T.audio.duration)
        delete T.razors[T.cur_doc];

    // audio is playing; advance razor
    if (T.audio && !T.audio.paused) {

        // update time frame to new section if razor has reached the end
        // of a selection, depending on if 'continuous scrolling' is enabled
        T.razors[T.cur_doc] = T.audio.currentTime;
        if (T.audio.currentTime > T.selections[T.cur_doc].end_time
            || T.audio.currentTime < T.selections[T.cur_doc].start_time) {
            if (T.docs[T.cur_doc].autoscroll) {
                let start = T.audio.currentTime, end = Math.min(start + 20, T.audio.duration);
                T.selections[T.cur_doc] = { start_time: start, end_time: end };
            }
            else {
                T.audio.pause();
                delete T.razors[T.cur_doc];
            }
        }

        // scrolling of overview and graph when playing audio
        let razor = T.razors[T.cur_doc];
        if (razor) {
            let ovWindow = document.getElementById(T.cur_doc + '-ov-wrapper');
            let left = ovWindow.scrollLeft, right = left + ovWindow.clientWidth;
            let rX = T.audio.duration * 10 * (razor / T.audio.duration);
            if (rX < left || rX > right) {
                ovWindow.scroll(rX, 0);
            }

            let graphWindow = document.getElementById(T.cur_doc + '-main-graph-wrapper');
            left = graphWindow.scrollLeft, right = left + graphWindow.clientWidth;
            rX = t2x(razor - T.selections[T.cur_doc].start_time);
            if (rX < left || rX > right) {
                graphWindow.scroll(rX, 0);
            }
        }

        render_opened_docitem(T.docs[T.cur_doc]);
    }

    window.requestAnimationFrame(tick);
}

function register_listeners() {
    const $uplArea = document.getElementById("upload-area");

    $uplArea.ondragover = function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "copy";
        ev.currentTarget.children[0].textContent = "RELEASE FILE TO UPLOAD";
    };
    $uplArea.ondragleave = function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.currentTarget.children[0].textContent = "UPLOAD FILE";
    };
    $uplArea.ondrop = function (ev) {
        ev.stopPropagation();
        ev.preventDefault();

        console.log("drop");
        ev.currentTarget.children[0].textContent = "UPLOAD FILE";

        got_files(ev.dataTransfer.files);
    };
    $uplArea.onclick = function () {
        document.getElementById("upload-button").click()
    };

    document.getElementById("upload-button").onchange = function (ev) {
        got_files(ev.target.files);
    };

    ////////// file-list bulk actions (download alls) ///////////

    // zip these, but cocatenate for csv
    ['mat', 'align', 'pitch','transcript'].forEach(name => {
        document.getElementById('dl-all-' + name).onclick = () => {
            Promise.all(get_docs().filter(doc => doc[name]).map(doc =>
                fetch('/media/' + doc[name]).then(response => response.blob()).then(blob => ({ docid: doc.id, blob: blob }))
            )).then(blobdocs => {
                console.log('zipping...');
                let zip = new JSZip();
                let folder = zip.folder(name + 'files');
                blobdocs.forEach(({ docid, blob }) => {
                    let doc = T.docs[docid];
                    let filename = doc.title.split('.').reverse()
                    filename.shift()
                    let filename_basic = filename.reverse().join('') + '-' + name, suffix = '.' + doc[name].split('.')[1];
                    let counter = 1;
                    let out_filename = filename_basic;
                    while (folder.file(out_filename + suffix)) out_filename = filename_basic + `(${counter++})`;
                    out_filename += suffix;
                    folder.file(out_filename, new File([blob], out_filename, { type: 'text/plain' }));
                })
                zip.generateAsync({ type: 'blob' }).then(content => saveAs(content, `${name}files.zip`));
            })
        }
    })

    document.getElementById('dl-all-csv').onclick = () => {
        Promise.all(get_docs().filter(doc => doc.csv).map(doc =>
            fetch('/media/' + doc.csv).then(response => response.text()).then(textContent => ({ docid: doc.id, textContent: textContent }))
        )).then(blobdocs => {
            let cocatenated = '';
            blobdocs.forEach(({ docid, textContent }) => {
                let doc = T.docs[docid];
                cocatenated += `"${doc.title}"`;
                let numCommas = textContent.substring(0, textContent.indexOf('\n')).split(',').length - 1;
                for (let i = 0; i < numCommas; i++) cocatenated += ',';
                cocatenated += '\n';
                cocatenated += textContent;
            })

            saveAs(new Blob([cocatenated]), 'driftcsvfiles.csv');
        })
    }

    document.getElementById('dl-all-voxitcsv').onclick = () => {
        
        let ranges = {}

        Promise.all(get_docs().filter(doc => doc.align).map(doc =>
            fetch('/media/' + doc.align)
                .then(align => align.json())
                .then(align => {
                    let [ start, end ] = ranges[doc.id] = get_transcript_range(doc.id, align)
                    return fetch(`/_measure?id=${doc.id}&start_time=${start}&end_time=${end}`)
                })
                .then(response => response.json())
                .then(resjson => ({ stats: resjson.measure, docid: doc.id }))
        )).then(measuredocs => { 

            let cocatenated = '';
            let keys;

            measuredocs.forEach(({ docid, stats }, i) => {
                let [ fulStart, fulEnd ] = ranges[docid]

                if (i === 0) {
                    keys = filter_stats(stats);
                    cocatenated = ['audio_document',...keys, 'start_time', 'end_time'].join(',') + '\n';
                }

                let doc = T.docs[docid];
                cocatenated += `"${doc.title}"` + ',';
                cocatenated += [...keys.map(key => stats[key]), fulStart, fulEnd].join(',') + '\n';
            })

            saveAs(new Blob([cocatenated]), 'voxitcsvfiles.csv');
        })
    }

    document.getElementById('delete-all-audio').onclick = () => get_docs().forEach(delete_action);

    // spacebar play/pause
    window.onkeydown = ev => {
        // XXX: Make sure we're not editing a transcript or toggling checkbox
        if (ev.target.tagName == 'TEXTAREA'
            || ev.target.tagName == 'INPUT') {
            return;
        }
        if (ev.key == ' ') {
            ev.preventDefault();
            toggle_playpause(); 
        }
    };

    document.getElementById('exit-gentle-warning').onclick = ev => {
        ev.currentTarget.parentElement.style.display = 'none';
    };
}

function check_gentle() {
    if (location.hostname == 'localhost')
    {
        fetch('//localhost:8765', { mode: 'no-cors' })
        .then(() => {
            console.log('Gentle seems to be running! (on port 8765)');
            T.found_gentle = true;
        })
        .catch(() => {
            T.found_gentle = false;
            document.getElementById('gentle-warning').style.display = 'flex';
        });
    }
    else
        T.found_gentle = true;
}

function render() {
    var fileList = new PAL.ExistingRoot('file-list'),
        docArea = new PAL.ExistingRoot('dashboard')
    render_filelist(fileList);
    render_dashboard(docArea);

    fileList.show();
    docArea.show();
}

function render_filelist(root) {

    if (T.grabbed) document.getElementById(root._attrs.id).classList.add('grabbed');
    else document.getElementById(root._attrs.id).classList.remove('grabbed');

    root.a({ 
        text: 'Skip file list', 
        classes: ['acsblty-skip'],
        attrs: { href: '#main-content' },
    });

    get_docs().forEach(doc => render_listitem(root, doc));
}

function render_listitem(root, doc) {

    let listItem = root.li({
        id: doc.id + '-listwrapper',
        classes: ['list-item', T.opened[doc.id] ? 'active' : '', T.grabbed == doc.id ? 'grabbed' : ''],
        attrs: { title: doc.title, tabindex: 0 },
        events: { 
            onclick: open_this_doc,
            onkeydown: ev => {
                // activate listitem if focused and pressed enter
                if (ev.target == ev.currentTarget && ev.keyCode == 13)
                {
                    ev.preventDefault();
                    ev.stopPropagation();
                    open_this_doc(ev);
                }
            }
        }
    });

    // dragger
    listItem.img({
        attrs: { src: "hamburger.svg", alt: "drag indicator", draggable: false, title: 'Drag to change order of document' },
        events: {
            onclick: ev => {
                ev.preventDefault();
                ev.stopPropagation();
            },
            onmousedown: start_dragging_listitem,
        }
    });

    // doc name
    listItem.span({ text: doc.title });

    // delete button
    listItem.button({
        classes: ["deleter"],
        events: {
            onclick: evnt => {
                evnt.stopPropagation();
                delete_action(doc);
            }
        }
    }).img({ attrs: { src: "delete.svg", alt: "delete icon", draggable: false } });

    /////////////// begin list item click events //////////////////

    function open_this_doc(ev) {
        ev.currentTarget.classList.toggle('active');
        if (T.opened[doc.id]) {
            delete T.opened[doc.id];
            T.docs[doc.id].hasunfolded = false;
            if (T.cur_doc === doc.id) {
                delete T.cur_doc;
                if (T.audio) T.audio.pause();
                delete T.audio;
            }
        }
        else {
            T.opened[doc.id] = true;
            if (has_data(doc.id)) {
                T.active[doc.id] = T.opened[doc.id];
                set_active_doc(doc);
            }
        }
        render();
    }

    function start_dragging_listitem(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        T.grabbed = doc.id;
        let curDocListItem = ev.currentTarget.parentElement, curDoc = doc,
            listArea = curDocListItem.parentElement;

        window.onmouseup = listArea.onmouseleave = () => {
            T.grabbed = listArea.onmouseleave = window.onmouseup = window.onmouseover = null;
            render();
        }

        render();

        window.onmouseover = ev2 => {
            // moved up
            if (ev2.clientY < curDocListItem.offsetTop - curDocListItem.parentElement.scrollTop) {
                if (curDoc.order != 1) {
                    T.docs[get_docs().find(x => x.order == curDoc.order - 1).id].order++;
                    curDoc.order = --T.docs[curDoc.id].order;
                    render();
                }
            }
            // moved down
            else if (ev2.clientY > curDocListItem.offsetTop - curDocListItem.parentElement.scrollTop + curDocListItem.clientHeight) {
                if (curDoc.order != get_docs().length) {
                    T.docs[get_docs().find(x => x.order == curDoc.order + 1).id].order--;
                    curDoc.order = ++T.docs[curDoc.id].order;
                    render();
                }
            }
        }
    }

    /////////////// end list item click events //////////////////
}

function render_dashboard(root) {

    if (get_docs().length == 0)
    {
        document.getElementById('nofiles').classList.add('show');
        document.getElementById('noneselected').classList.remove('show');
    }
    else {
        document.getElementById('nofiles').classList.remove('show');
        if (get_opened_docs().length === 0) document.getElementById('noneselected').classList.add('show');
        else document.getElementById('noneselected').classList.remove('show');
    }

    if (T.grabbed) document.getElementById(root._attrs.id).classList.add('grabbed');
    else document.getElementById(root._attrs.id).classList.remove('grabbed');

    get_opened_docs().forEach((doc, i) => {

        root.div({
            id: doc.id + '-docitem',
            classes: ['driftitem', T.grabbed == doc.id ? 'grabbed' : '', !doc.hasunfolded ? 'firstunfold' : ''],
        });
        setTimeout(() => T.docs[doc.id].hasunfolded = true, 300);

        // if only there was a Element.onload event T-T
        // anyways, wait for the HTMLElement to actually get created by palilalia (during PAL.ExistingRoot#show() or PAL.Root#show()),
        // before render_opened_docitem will create a PAL.ExistingRoot from the loaded HTMLElement
        // this will speed up rendering for certain processes like ticking played audio
        // since we don't have to render the whole page again, just docitems that have been changed
        (function queryDocContainer() {
            if (document.getElementById(doc.id + '-docitem'))
                render_opened_docitem(doc, i);
            else
                setTimeout(queryDocContainer, 100);
        })()
    });
}

function render_opened_docitem(doc, offset) {

    if (offset === undefined)
        offset = get_opened_docs().findIndex(d => d.id == doc.id);

    let docContainer = new PAL.ExistingRoot(doc.id + '-docitem');

    render_docitem_topbar(docContainer, doc, offset);

    let contentarea = docContainer.div({ classes: ['driftitem-content'] });

    if (!has_data(doc.id))
        render_transcript_input(contentarea, doc);
    else
        render_docitem_content(contentarea, doc);
    
    docContainer.show();
}

function render_docitem_topbar(root, doc, offset) {

    let docbar = root.div({
        id: doc.id + "-bar",
        classes: ['docbar']
    });

    // dragger
    docbar.img({
        attrs: { src: "tictactoe.svg", alt: 'drag indicator', draggable: false, title: 'Drag to change order of document' },
        events: {
            onclick: ev => {
                ev.preventDefault();
                ev.stopPropagation();
            },
            onmousedown: start_dragging_docitem,
        }
    });

    // doc name
    docbar.div({
        id: doc.id + '-name',
        classes: ['doc-name'],
        text: doc.title
    });

    render_hamburger(docbar, doc);

    /////////////// begin doc item click events //////////////////

    function start_dragging_docitem(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        T.grabbed = doc.id;
        let curDocItem = ev.currentTarget.parentElement.parentElement, curDoc = doc,
            docArea = curDocItem.parentElement, j = offset;

        window.onmouseup = docArea.onmouseleave = () => {
            T.grabbed = docArea.onmouseleave = window.onmouseup = window.onmouseover = null;
            render();
        }
        render();

        window.onmouseover = ev2 => {
            // moved up
            let ordered_ids = get_opened_docs().map(doc => doc.id);
            if (j != 0 && ev2.clientY < curDocItem.offsetTop - window.scrollY - 36) {
                if (j != 0) {
                    [T.docs[ordered_ids[j - 1]].order, T.docs[curDoc.id].order] = [T.docs[curDoc.id].order, T.docs[ordered_ids[j - 1]].order];
                    curDoc.order = T.docs[curDoc.id].order;
                    j -= 1;
                    render();
                    window.scrollTo(0, curDocItem.offsetTop - ev2.clientY);
                }
            }
            // moved down
            else if (ev2.clientY > curDocItem.offsetTop - window.scrollY + curDocItem.clientHeight + 36) {
                if (j != ordered_ids.length - 1) {
                    [T.docs[ordered_ids[j + 1]].order, T.docs[curDoc.id].order] = [T.docs[curDoc.id].order, T.docs[ordered_ids[j + 1]].order];
                    curDoc.order = T.docs[curDoc.id].order;
                    j += 1;
                    render();
                    window.scrollTo(0, curDocItem.offsetTop - ev2.clientY);
                }
            }
        }
    }

    /////////////// end doc item click events //////////////////
}

function render_docitem_content(root, doc) {

    /*
            +-----------------------------------------+  
            |+--+ +----------------------+ +---------+|  <
            ||  | |     overview         | | tf table||  | top section
            |+--+ +----------------------+ +---------+|  <
            |+---------------------------------------+|  <
            ||                                       ||  |
            ||             graph                     ||  | graph section
            ||                                       ||  |
            |+---------------------------------------+|  <
            |+---------------------------------------+|  <
            ||              stat table               ||  |  table section
            |+---------------------------------------+|  <
            +-----------------------------------------+
    */

    let topSection = root.section({
        classes: ['top-section']
    }), graphSection = root.section({
        classes: ['graph-section']
    }), tableSection = root.section({
        classes: ['table-section']
    })

    let tftable = {}

    render_top_section(topSection, doc, tftable)
    render_graph_section(graphSection, doc)
    render_table_section(tableSection, doc, tftable)
}

function render_top_section(root, doc, tftable) {

    let playBtn = root.button({
        classes: ['play-btn'],
        events: {
            onclick: ev => {
                set_active_doc(doc);
                toggle_playpause();
            },
            onkeyup: ev => {
                if (ev.key == ' ')
                    ev.preventDefault();
            }
        },
    })

    const thisPlaying = (T.cur_doc != doc.id || !T.audio || T.audio.paused);
    playBtn.img({ attrs: { src: thisPlaying ? 'play-icon.svg' : 'pause-icon.svg' } });
    playBtn.span({ text: thisPlaying ? 'play' : 'pause' });

    let ov_div = root.div({
        id: doc.id + '-ovdiv',
        classes: ['overview']
    });

    let owTop = ov_div.div({ classes: ['overview-top'] });
    owTop.p({ text: "Drag to select a region" });
    let playOpt = owTop.div({ classes: ['play-opt'] });
    playOpt.button({
        text: 'jump to start of transcript',
        events: {
            onmousedown: ev => {
                ev.preventDefault();
            },
            onclick: () => {
                let segments = (get_cur_align(doc.id) || {}).segments;
                if (segments) {
                    delete T.razors[doc.id];
                    let start = segments[0].start, end = Math.min(start + 20, segments[segments.length - 1].end);
                    T.selections[doc.id] = { start_time: start, end_time: end };
                    render_opened_docitem(T.docs[doc.id]);
                }
            },
        }
    });
    playOpt.label({
        id: doc.id + '-lab1',
        text: 'continuous scrolling',
        attrs: {
            for: doc.id + '-rad1',
            title: 'auto-select next region on playthrough'
        }
    })
    playOpt.input({
        id: doc.id + '-rad1',
        attrs: {
            type: 'checkbox',
            name: 'playopt'
        },
        events: {
            onchange: () => {
                T.docs[doc.id].autoscroll = !T.docs[doc.id].autoscroll;
            },
            onmousedown: ev => {
                ev.preventDefault();
            },
        }
    })
    render_overview(ov_div.div({ id: doc.id + '-ov-wrapper', classes: ['overview-wrapper'] }), doc);

    // initialize div for timeframe table, but populate it later down when we call render_stats
    tftable.value = root.div({ classes: ['timeframe-wrapper'] });
}

function render_graph_section(root, doc) {

    let det_div = root.div({
        id: doc.id + '-detdiv',
        classes: ['detail']
    });

    render_graph(det_div, doc);
}

function render_table_section(root, doc, tftable) {

    render_stats(root.div({ classes: ['table-wrapper'] }), tftable.value, doc);

    root.span({}).a({
        text: '*vocal duration that corresponds to the transcript',
        attrs: {
            title: 'Click for more information',
            href: 'fragmentDirective' in document ? 'prosodic-measures.html#:~:text=' + escape('Full Recording Duration vs. Selection') : 'prosodic-measures.html#full-vs-selection',
            target: '_blank'
        },
    });
    
    root.span({ id: doc.id + '-voxit' }).a({
        text: 'Prosodic measures are calculated using Voxit',
        attrs: {
            title: 'Click for more information about Voxit',
            href: 'fragmentDirective' in document ? 'about.html#:~:text=' + escape('About Voxit: Vocal Analysis Tools') : 'about.html#about-voxit',
            target: '_blank'
        },
    });
}

function render_stats(mainTableRoot, timeframeRoot, doc) {
    
    let { start_time: selStart, end_time: selEnd } = (get_selection(doc.id) || {});
    let statsFullTSDur = get_measures_fullTS(doc.id)

    let uid = doc.id + '-' + selStart + '-' + selEnd;
    
    let table = mainTableRoot.table({ classes: ['stat-table drift-table'] });
    let headers = table.tr({ classes: ['stat-header'] }),
    fullRecordingDatarow = table.tr({ id: uid + '-row1' }),
    selectionDatarow = table.tr({ id: uid + '-row2' });
    
    let firstcell = headers.th({});
    fullRecordingDatarow.th({ text: "full recording duration*" });
    selectionDatarow.th({ text: "selection" });
    
    let timeframe = timeframeRoot.table({ classes: ['timeframe-table drift-table'] });
    let tfh = timeframe.tr({ id: uid + '-tfh' }),
    tfb = timeframe.tr({ id: uid + '-tfb' });

    let [ fulStart, fulEnd ] = get_transcript_range(doc.id) || []
    let fullTSDuration = fulEnd - fulStart

    Object.entries({
        'full recording duration*': Math.round(fullTSDuration * 10) / 10 + 's',
        'selection start': Math.round(selStart * 10) / 10 + 's',
        'selection end': Math.round(selEnd * 10) / 10 + 's',
        'selection length': Math.round((selEnd - selStart) * 10) / 10 + 's'
    }).forEach(([label, data], i) => {
        tfh.th({ text: label });
        if (i == 1 || i == 2) {
            tfb.td({ id: uid + '-tfb' + i, classes: ['editable'] }).input({
                attrs: { value: data, step: 0.1 },
                events: {
                    onkeydown: ev => {
                        if (ev.keyCode == 13) {
                            ev.preventDefault();
                            ev.currentTarget.blur();
                        }
                    },
                    onblur: update_timeframe,
                    onfocus: ev => {
                        let { value } = ev.currentTarget
                        if (value.slice(-1) === 's')
                            ev.currentTarget.value = value.slice(0, -1);

                        ev.currentTarget.setAttribute("type", "number");
                    },
                }
            });
        }
        else
            tfb.td({ id: uid + '-tfb' + i, text: data });
        
        /////////////// begin timeframe item click event //////////////////

        function update_timeframe(ev) {
            let { value } = ev.currentTarget;
            value = parseFloat(value);
            const [thisTime, otherTime] = i == 1 ? ['start_time', 'end_time'] : ['end_time', 'start_time'];
            let error;

            if ((!value && value != 0) || value < 0) error = 'Time must be positive and non-null!';
            else {
                if (T.selections[doc.id][thisTime] != value) {
                    let otherValue = T.selections[doc.id][otherTime];
                    if ((i == 1 && value >= otherValue) || (i == 2 && value <= otherValue)) error = 'Invalid range!';
                    else if (Math.abs(value - otherValue) > 30 || Math.abs(value - otherValue) < 0.2) error = 'Range must be between 0.2s and 30s';
                    else {
                        ev.currentTarget.value = T.selections[doc.id][thisTime] = Math.min(value, T.docs[doc.id].duration);
                        delete T.razors[doc.id];
                        render_opened_docitem(T.docs[doc.id]);
                    }
                }
            }

            if (error) {
                ev.currentTarget.value = T.selections[doc.id][thisTime];
                alert(error);
            }
            ev.currentTarget.value = Math.round(ev.currentTarget.value * 10) / 10;
            ev.currentTarget.setAttribute("type", "text");
            ev.currentTarget.value += 's';
        }

        /////////////// end timeframe item click event //////////////////
    });
    
    if (selStart === undefined || statsFullTSDur === undefined) {
        mainTableRoot.div({ text: "Loading...", classes: ["table-loading"] })
        return
    }

    // only send request for prosodic measures if user has finished dragging
    if (!T.DRAGGING) {
        T.docs[doc.id].curSelStats = get_measures(doc.id, selStart, selEnd);
    }
    
    let { curSelStats } = T.docs[doc.id];
    let keys = filter_stats(statsFullTSDur);

    // TODO fix link bookmarks with > symbols (works on firefox, not on safari)
    keys.forEach(dataLabel => {
        headers.th({
            id: dataLabel + '-h'
        }).a({
            text: dataLabel.replace(/_/g, ' '),
            attrs: T.DESCRIPTIONS[dataLabel] ? {
                href: 'fragmentDirective' in document ? 'prosodic-measures.html#:~:text=' + escape(T.DESCRIPTIONS[dataLabel]) 
                    : 'prosodic-measures.html#' + (dataLabel.includes('Pause_Count') ? 'Gentle_Pause_Count' : dataLabel),
                target: '_blank',
                title: splitString(T.DESCRIPTIONS[dataLabel], 40, 4) + '\n(Click label for more information)',
            } : {},
            events: { onmousedown: ev => ev.preventDefault() }
        })
        fullRecordingDatarow.td({
            id: dataLabel + '-d',
            text: '' + Math.round(statsFullTSDur[dataLabel] * 100) / 100
        })
        selectionDatarow.td({
            parent: selectionDatarow,
            id: dataLabel + '-d',
            text: '' + (curSelStats ? Math.round(curSelStats[dataLabel] * 100) / 100 : 'n/a')
        })
    })

    firstcell.a({ 
        text: 'Skip table headers', 
        classes: ['acsblty-skip'],
        attrs: { href: `#${doc.id}-copy-btn` } 
    });

    mainTableRoot.button({
        text: 'Copy to Clipboard',
        id: doc.id + '-copy-btn',
        classes: ['copy-btn'],
        events: {
            onclick: () => {
                let cliptxt = voxit_to_tab_separated(doc, keys, statsFullTSDur, curSelStats, fulStart, fulEnd, selStart, selEnd);

                // Create, select, copy, and remove a textarea.
                let $el = document.createElement('textarea');
                $el.textContent = cliptxt;
                document.body.appendChild($el);
                $el.select();
                document.execCommand("copy");
                document.body.removeChild($el);
                document.getElementById('copied-alert').classList.add('visible');
                setTimeout(() =>
                    document.getElementById('copied-alert').classList.remove('visible'), 2000);
            }
        }
    });

}

function get_transcript_range(docid, align) {
    let { segments } = align || get_cur_align(docid) || {}; 

    if (segments === undefined)
        return;
    
    return [ segments[0].start, segments[segments.length - 1].end ];
}

function get_measures_fullTS(docid) {
    let [ start, end ] = get_transcript_range(docid) || []; 

    if (start === undefined)
        return;
    
    return get_measures(docid, start, end);
}

function get_measures(docid, start, end) {
        return cached_get_url(`/_measure?id=${docid}&start_time=${start}&end_time=${end}`, JSON.parse).measure;
}

function filter_stats(stats) {
    // take out start_time and end_time and pause counts that are not 100, 500, 1000, or 2000
    let keys = Object.keys(stats).slice(2).filter(key => !key.startsWith('Gentle_Pause_Count') || ['100', '500', '1000', '2000'].find(pauseLen => key.includes('>' + pauseLen)));
    
    // sort keys so that WPM comes first, then Drift measures, then Gentle measures, and lastly Gentle Pause Count measures
    let pauseCounts = keys.splice(
        keys.findIndex(d => d.startsWith('Gentle_Pause_Count')), 
        keys.findIndex(d => d.includes('Gentle_Long_Pause_Count'))
    );
    let drifts = keys.splice(keys.findIndex(d => d.startsWith('Drift')));
    keys.splice(1, 0, ...drifts);
    keys.push(...pauseCounts);

    return keys;
}

// I add these extra arguments so we don't have to recalculate a bunch of stuff IF we already have them on hand
function voxit_to_tab_separated(doc, keys, stats, curSelStats, fulStart, fulEnd, selStart, selEnd) {  
    
    if (stats === undefined) {
        stats = get_measures_fullTS(doc.id);
        curSelStats = T.docs[doc.id].curSelStats;

        let segments = (get_cur_align(doc.id) || {}).segments;
        fulStart = segments[0].start;
        fulEnd = segments[segments.length - 1].end;

        let { start_time, end_time } = T.selections[doc.id];
        selStart = start_time;
        selEnd = end_time;
    }

    let cliptxt = '\t';
    keys.forEach((key) => {
        cliptxt += key + '\t';
    });
    cliptxt += "start_time\tend_time\t"
    cliptxt += '\nfull clip\t';
    keys.forEach((key) => {
        cliptxt += stats[key] + '\t';
    });

    cliptxt += fulStart + '\t' + fulEnd + '\t';
    cliptxt += '\nselection\t';
    keys.forEach((key) => {
        cliptxt += curSelStats[key] + '\t';
    });
    cliptxt += selStart + '\t' + selEnd + '\t';
    cliptxt += '\n';

    return cliptxt;
}

function render_transcript_input(root, doc) {

    const readyForTranscript = !(doc.upload_status && !doc.path);

    if (readyForTranscript)
        root.textarea({
            id: 'tscript-' + doc.id,
            classes: ['ptext'],
            attrs: {
                placeholder: "Enter Gentle Transcript here...",
                rows: 5
            },
            events: {
                onclick: (ev) => {
                    ev.stopPropagation();
                }
            }
        });

    let bottomWrapper = root.div({ classes: ["bottom-wrapper"] });
    bottomWrapper.button({
        text: readyForTranscript ? "set transcript" : "uploading...",
        attrs: readyForTranscript && T.found_gentle ? {} : { disabled: false },
        events: { onclick: set_transcript }
    });

    if ((doc.upload_status || doc.upload_status === 0) && !doc.path) {
        bottomWrapper.progress({
            id: doc.id + '-upload-progress',
            attrs: {
                max: "100",
                value: "" + Math.floor((100 * doc.upload_status))
            },
        })
    }
    else if ((doc.align_px || doc.align_px === 0) && !doc.align) {
        bottomWrapper.progress({
            id: doc.id + '-align-progress',
            parent: bottomWrapper,
            attrs: {
                max: "100",
                value: "" + Math.floor((100 * doc.align_px))
            },
        })
    }

    /////////////// begin transcript setter click events //////////////////

    function set_transcript(ev) {

        ev.preventDefault();
        ev.stopPropagation();

        // prevent dual-submission...
        this.disabled = true;
        this.textContent = "aligning transcript...";

        document.getElementById('tscript-' + doc.id).disabled = true;

        var txt = document.getElementById('tscript-' + doc.id).value;
        if (txt) {
            var blob = new Blob([txt]);
            blob.name = "_paste.txt";
            attach.put_file(blob, function (ret) {
                // Uploaded transcript!
                FARM.post_json("/_rec/_update", {
                    id: doc.id,
                    transcript: ret.path
                }, (ret) => {
                    Object.assign(T.docs[doc.id], ret.update);
                    render();

                    // Immediately trigger an alignment
                    FARM.post_json("/_align", { id: doc.id }, (p_ret) => {
                        console.log("align returned");
                        set_active_doc(T.docs[ret.id]);

                        // Trigger CSV & MAT computation (assuming pitch also there)
                        FARM.post_json("/_csv", { id: doc.id }, (c_ret) => {
                            console.log("csv returned");
                        });
                        FARM.post_json("/_mat", { id: doc.id }, (c_ret) => {
                            console.log("mat returned");
                        });
                    });


                });
            });
        }
    }

    /////////////// end transcript setter click events //////////////////
}

function render_pitch(root, id, seq, attrs) {
    // Draw the entire pitch trace
    let ps = '';
    let started = false;
    seq
        .forEach((p, p_idx) => {
            if (p > 0) {
                if (!started) {
                    ps += 'M ';
                }
                ps += '' + fr2x(p_idx) + ',' + (pitch2y(p)) + ' ';
                started = true;
            }
            else {
                started = false;
            }
        });

    root.path({
        id: id,
        attrs: Object.assign({
            d: ps,
            'stroke-width': 1,
            fill: 'none',
            'stroke-linecap': 'round'
        }, attrs || {})
    });

}

function render_overview(root, doc) {

    if (placeholder_on_unready(root, doc.id)) return;

    let align = get_cur_align(doc.id);
    let { duration } = T.docs[doc.id];

    let width = duration * 10;      // scale of overview is 10 pixels/1 second
    let height = 50;

    let svg = root.svg({
        id: doc.id + '-svg-overview',
        attrs: {
            width: width,
            height: height,
        },
        events: {
            onmousedown: start_selection
        }
    });

    svg.rect({
        id: doc.id + '-svg-overview-bg',
        attrs: {
            x: 0,
            y: 0,
            width: '100%',
            height: height,
            fill: '#F7F7F7'
        }
    })

    // render word gaps
    let firstword = Infinity, lastword = -1
    align.segments
        .forEach((seg, seg_idx) => {
            let gap = false, wdstart = Infinity
            seg.wdlist.forEach((wd, wd_idx) => {
                if (!wd.end || !wd.start) { return }

                if (wd.type == 'gap') {
                    gap = true
                    svg.rect({
                        id: 'gap-' + seg_idx + '-' + wd_idx,
                        attrs: {
                            x: width * (wd.start / duration),
                            y: 0,
                            width: width * (wd.end - wd.start) / duration,
                            height: height,
                            fill: '#D9D9D9'
                        }
                    })
                }
                else {
                    if (wd.end > lastword)
                        lastword = wd.end
                    if (wd.start < firstword)
                        firstword = wd.start
                }
            })
        });

    // render simplified pitch trace
    let { smoothed } = (pitch_stats(get_cur_pitch(doc.id)) || {});

    let pitch_step = 0.01;      // each index of array `smoothed` is 10 ms
    let voiceStart;

    (smoothed || []).forEach((pitch, p_idx) => {
        if (pitch > 0 && !voiceStart) {
            voiceStart = p_idx;
        }
        // if voiced period ends, is greater than 20 ms or passes between the boundary of either start or end_time,
        // render a rectangle that represents the average pitch of that voice period
        else if (voiceStart 
            && ((pitch === 0 && p_idx - voiceStart > 20)
                || ((p_idx - 1) * pitch_step <= firstword && p_idx * pitch_step > firstword)
                || ((p_idx - 1) * pitch_step < lastword && p_idx * pitch_step >= lastword))) {

            let voicedPeriod = get_cur_pitch(doc.id)
                .slice(Math.floor(voiceStart), Math.floor(p_idx));
            let pitch_mean = (pitch_stats(voicedPeriod) || {})['pitch_mean'];
            if (pitch_mean) {

                let y = pitch2y(pitch_mean) / 5,
                    within_transcript_duration = p_idx * pitch_step >= firstword && p_idx * pitch_step <= lastword;
                svg.rect({
                    id: doc.id + '-word-' + p_idx,
                    attrs: {
                        x: width * (voiceStart * pitch_step / duration),
                        y: y,
                        width: width * (p_idx - voiceStart) * pitch_step / duration,
                        height: within_transcript_duration ? 2 : 1,
                        fill: within_transcript_duration ? '#E4B186' : '#C9C9C9'
                    }
                })
            }
            voiceStart = pitch === 0 ? null : p_idx;
        }

    });

    let { start_time, end_time } = (get_selection(doc.id) || {});
    
    // render selection overlay
    if (start_time) {        

        svg.rect({
            id: doc.id + '-o-selection-pre',
            attrs: {
                x: 0,
                y: 0,
                width: width * (start_time / duration),
                height: height,
                fill: 'rgba(218,218,218,0.4)'
            }
        });
        svg.rect({
            id: doc.id + '-o-selection-post',
            attrs: {
                x: width * (start_time / duration) + width * ((end_time - start_time) / duration),
                y: 0,
                width: width - (width * (start_time / duration) + width * ((end_time - start_time) / duration)),
                height: height,
                fill: 'rgba(218,218,218,0.4)'
            }
        });

        svg.rect({
            id: doc.id + '-o-selection',
            attrs: {
                x: width * (start_time / duration),
                y: 1,
                width: width * ((end_time - start_time) / duration),
                height: height - 2,
                stroke: 'rgba(128, 55, 43, 1)',
                'stroke-width': 1,
                fill: 'none',
                rx: 2
            }
        });
    }

    // render razor
    if (T.cur_doc == doc.id && T.razors[doc.id]) {
        svg.rect({
            id: doc.id + '-o-razor',
            attrs: {
                x: width * (T.razors[doc.id] / duration),
                y: 0,
                width: 2,
                height: height,
                fill: 'rgba(128, 55, 43, 0.4)'
            }
        });
    }

    // render seconds (every 15 seconds)
    for (let x = 15; x < duration; x += 15) {
        svg.text({
            id: doc.id + '-ov-' + '-xaxistxt-' + x,
            text: '' + x + 's',
            attrs: {
                x: width * (x / duration) + 2,
                y: height - 3,
                class: 'axis',
                fill: '#3B5161',
                opacity: 0.5
            }
        })
    }

    /////////////// begin overview click events //////////////////

    function start_selection(ev) {
        ev.preventDefault();

        // Compute time for razor (XXX: make selection?)
        let t1 = (ev.offsetX / width) * duration;
        let t2 = t1;

        T.DRAGGING = true;

        ev.currentTarget.onmousemove = (ev) => {
            t2 = (ev.offsetX / width) * duration;
            t2 = Math.max(0, Math.min(t2, duration));

            if (Math.abs(t2 - t1) > 0.2) {

                let start = Math.min(t1, t2);
                let end = Math.max(t1, t2);

                // Limit to 30secs
                end = Math.min(start + 30, end);

                T.selections[doc.id] = {
                    start_time: start,
                    end_time: end
                };

                render_opened_docitem(T.docs[doc.id]);
            }
            else {
                // if(doc.id in T.selections) {
                //     delete T.selections[doc.id];
                //     render();
                // }
            }

        }
        ev.currentTarget.onmouseleave = ev.currentTarget.onmouseup = (ev) => {
            T.DRAGGING = false;

            set_active_doc(doc);

            if (Math.abs(t2 - t1) < 0.2) {
                T.razors[doc.id] = t2;
                T.audio.currentTime = t2;
            }
            else {
                delete T.razors[doc.id];
            }
            render_opened_docitem(T.docs[doc.id]);

            ev.currentTarget.onmouseup = ev.currentTarget.onmouseleave = ev.currentTarget.onmousemove = null;
        };
    }

    /////////////// end overview click events //////////////////
}

function render_graph(root, doc) {

    let { start_time, end_time } = (get_selection(doc.id) || {});

    if (placeholder_on_unready(root, doc.id) || start_time === undefined ) return;

    root._attrs.classes.push('loaded');
    let segs = get_cur_align(doc.id).segments;
    let duration = end_time - start_time;

    const seg_w = t2x(duration);

    // render svg for sticky y-axis area
    let yAxisSvg = root.svg({
        id: doc.id + '-axis-svg-',
        attrs: {
            width: 50,
            height: T.PITCH_H + 1,  /* 1 additional pixel so border perfectly ends on the bottom of the y-axis */
            class: 'x-axis',
        },
    })

    // render right border to act as sticky y-axis
    yAxisSvg.line({
        attrs: {
            'stroke-width': 2,
            stroke: '#DCDCDC',
            x1: 49,
            y1: 0,
            x2: 49,
            y2: T.PITCH_H + 1,
        }
    })

    // render svg for rest of graph
    let mainGraphWrapper = root.div({ id: doc.id + '-main-graph-wrapper', classes: ['main-graph-wrapper'] });
    let svg = mainGraphWrapper.svg({
        id: doc.id + '-svg-',
        attrs: {
            width: seg_w,
            height: T.PITCH_H + 35
        },
        events: {
        }
    });

    svg.line({
        id: doc.id + '-seg-' + '-axis-0',
        attrs: {
            x1: 0,
            y1: T.PITCH_H,
            x2: seg_w,
            y2: T.PITCH_H,
            'stroke-width': 2,
            stroke: '#DCDCDC'
        }
    })

    // render x-axes
    var colors = { 50: "#DADADA", 100: "#E0E0E0", 200: "#E5E5E5", 400: "#F0F0F0" };
    let lastYPx = T.PITCH_H;
    for (let yval = 50; yval <= 400; yval += 50) {
        var y_px = pitch2y(yval);
        let color = colors[yval];

        // add color change for desired intervals
        if (color) {

            svg.rect({
                id: doc.id + '-d-bg-' + yval,
                attrs: {
                    x: 0,
                    y: y_px,
                    width: '100%',
                    height: lastYPx - y_px,
                    fill: color,
                    opacity: 0.2
                }
            })

            yAxisSvg.text({
                id: doc.id + '-seg-' + '-axistxt-' + yval,
                text: '' + yval,
                attrs: {
                    x: '30%',
                    y: y_px + 5,
                    class: 'axis',
                    fill: '#3B5161'
                }
            })

            lastYPx = y_px;
        }

        svg.line({
            id: doc.id + '-seg-' + '-axis-' + yval,
            attrs: {
                x1: 0,
                y1: y_px,
                x2: seg_w,
                y2: y_px,
                "stroke-width": color ? 1 : 0.5,
                stroke: '#DCDCDC',
            }
        });
    }

    // render y-axes
    for (let x = Math.ceil(start_time); x < end_time; x++) {
        if (x == 0) continue;
        var x_px = t2x(x - start_time);

        svg.line({
            id: doc.id + '-seg-' + '-xaxis-' + x,
            attrs: {
                x1: x_px,
                y1: 0,
                x2: x_px,
                y2: T.PITCH_H,
                stroke: '#DCDCDC'
            }
        })
        svg.text({
            id: doc.id + '-seg-' + '-xaxistxt-' + x,
            text: '' + x,
            attrs: {
                x: x_px - 2,
                y: T.PITCH_H + 16,
                class: 'axis',
                fill: '#3B5161'
            }
        })
    }

    // render pitch trace
    let seq_stats = pitch_stats(
        get_cur_pitch(doc.id).slice(Math.round(start_time * 100),
            Math.round(end_time * 100)));

    if (seq_stats) {
        render_pitch(
            svg, doc.id + '-sspath-',
            seq_stats.smoothed,
            {
                stroke: '#D58139',
                opacity: "60%",
                'stroke-width': 3,
            }
        );
    }

    // render amplitude
    get_cur_rms(doc.id)
        .slice(Math.round(start_time * 100),
            Math.round(end_time * 100))
        .forEach((r, r_idx) => {

            let h = r * T.PITCH_H / 5;
            let cy = 9.25 / 10 * T.PITCH_H;

            svg.line({
                id: doc.id + '-rms-' + '-' + r_idx,
                attrs: {
                    x1: fr2x(r_idx),
                    y1: cy - (h / 2),
                    x2: fr2x(r_idx),
                    y2: cy + (h / 2),
                    stroke: '#646464',
                    'stroke-width': 2,
                }
            })
        });

    // render words
    segs.forEach((seg, seg_idx) => {
        seg.wdlist.forEach((wd, wd_idx) => {

            if (!wd.end) { return }

            if (wd.start >= end_time || wd.end <= start_time) { return; }

            if (wd.type == 'gap') {
                svg.rect({
                    id: doc.id + '-gap-' + seg_idx + '-' + wd_idx,
                    attrs: {
                        x: t2x(wd.start - start_time),
                        y: 0,
                        width: t2w(wd.end - wd.start),
                        height: T.PITCH_H,
                        fill: 'rgba(0,0,0,0.05)'
                    }
                })

                return
            }

            let wd_stats = pitch_stats(get_cur_pitch(doc.id).slice(Math.round(wd.start * 100),
                Math.round(wd.end * 100)));

            svg.text({
                id: doc.id + '-txt-' + seg_idx + '-' + wd_idx,
                text: wd.word,
                attrs: {
                    class: wd.type == 'unaligned' ? 'unaligned' : 'word',
                    x: t2x(wd.start - start_time),
                    //y: pitch2y((wd_stats&&wd_stats.pitch_mean) || seq_stats.pitch_mean) - 2,
                    y: Math.max(30, pitch2y((wd_stats && wd_stats.pitch_percentile_91) || seq_stats.pitch_mean) - 2),
                    fill: '#3B5161',
                }
            })
        });
    });

    // render razor
    if (T.cur_doc == doc.id && T.razors[doc.id]) {
        svg.rect({
            id: 'd-razor-' + doc.id,
            attrs: {
                x: t2x(T.razors[doc.id] - start_time),
                y: 0,
                width: 2,
                height: T.PITCH_H,
                fill: T.razors[doc.id + '-hover'] ? 'rgba(128, 55, 43, 0.4)' : '#80372B'
            }
        });
    }

    // render razor that appears on hover
    if (T.razors[doc.id + '-hover']) {
        const hovX = t2x(T.razors[doc.id + '-hover'] - start_time);
        svg.rect({
            id: doc.id + '-d-razor-hover',
            attrs: {
                x: hovX,
                y: 0,
                width: 2,
                height: T.PITCH_H,
                fill: '#80372B'
            }
        });
        let tag = mainGraphWrapper.div({
            classes: ['infotag'],
            attrs: {
                style: `left: ${hovX + 10}px; top: ${T.PITCH_H / 2}px;`
            }
        }).div({});
        Object.entries({
            time: Math.round(T.razors[doc.id + '-hover'] * 100) / 100,
            pitch: get_cur_pitch(doc.id)[Math.round(T.razors[doc.id + '-hover'] * 100)] || 'N/A'
        }).forEach(([label, val], i) => {
            let half = tag.div({ id: doc.id + '-tag-' + i });
            half.span({ text: label });
            half.span({ text: val });
        })
    }

    // render a rectangle to detect hoverarea (don't want hover-razor to appear when hovering below x-axis)
    svg.rect({
        id: doc.id + '-graph-hover-area',
        attrs: {
            width: seg_w,
            height: T.PITCH_H,
            stroke: 'none',
            fill: 'transparent',
        },
        events: {
            onclick: (ev) => {
                ev.preventDefault();

                // Seek!
                let t = start_time + x2t(ev.offsetX);
                T.razors[doc.id] = t;
                set_active_doc(doc);
                T.audio.currentTime = t;
                render_opened_docitem(T.docs[doc.id]);
            },
            onmousemove: ev => {
                T.razors[doc.id + '-hover'] = start_time + x2t(ev.offsetX);
                render_opened_docitem(T.docs[doc.id]);
            },
            onmouseleave: ev => {
                delete T.razors[doc.id + '-hover'];
                render_opened_docitem(T.docs[doc.id]);
            }
        }
    });

    let dl_btn = root.button({
        classes: ['dl-graph-btn'],
        events: {
            onclick: () => download_graph_png(doc.id)
        }
    });

    dl_btn.span({ text: "Download Graph" });
    dl_btn.img({ attrs: { src: 'download-icon.svg' } });
}

function download_graph_png(docid) {

    let graphElement = document.getElementById(docid + '-detdiv');
    let svg1 = graphElement.children[0].cloneNode(true), svg2 = graphElement.children[1].children[0].cloneNode(true);
    svg2.setAttribute("x", svg1.width.baseVal.value);
    let svgWhole = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgWhole.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgWhole.setAttribute("style", `font-family: 'futura-pt', 'Helvetica', 'Arial', sans-serif; font-size: 14.4px; background: white;`);
    svgWhole.setAttribute("width", svg1.width.baseVal.value + svg2.width.baseVal.value);
    svgWhole.setAttribute("height", svg2.height.baseVal.value);
    svgWhole.appendChild(svg1);
    svgWhole.appendChild(svg2);
    let pitchLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    pitchLabel.textContent = 'log';
    pitchLabel.setAttribute('y', svg2.height.baseVal.value - 50);
    pitchLabel.setAttribute('style', 'font-weight: 600;');
    let pitchLabel2 = pitchLabel.cloneNode(), pitchLabel3 = pitchLabel.cloneNode();
    pitchLabel2.textContent = 'pitch'
    pitchLabel2.setAttribute('dy', '1.1em');;
    pitchLabel3.textContent = '(hz)'
    pitchLabel3.setAttribute('dy', '2.2em');;
    let secondsLabel = pitchLabel.cloneNode();
    secondsLabel.textContent = 'seconds';
    secondsLabel.setAttribute('x', 50);
    secondsLabel.setAttribute('y', svg2.height.baseVal.value - 20);
    svgWhole.appendChild(pitchLabel);
    svgWhole.appendChild(pitchLabel2);
    svgWhole.appendChild(pitchLabel3);
    svgWhole.appendChild(secondsLabel);
    let razor = svgWhole.getElementById('d-razor-' + docid);
    if (razor) razor.remove();

    // https://stackoverflow.com/questions/23218174/how-do-i-save-export-an-svg-file-after-creating-an-svg-with-d3-js-ie-safari-an
    // https://stackoverflow.com/questions/3975499/convert-svg-to-image-jpeg-png-etc-in-the-browser
    let svgBlob = new Blob([svgWhole.outerHTML], { type: "image/svg+xml" });
    let svgUrl = URL.createObjectURL(svgBlob);
    let img = new Image();
    let canvas = document.createElement('canvas');
    let [width, height] = [svg1.width.baseVal.value + svg2.width.baseVal.value, svg2.height.baseVal.value];
    width *= 1.5; height *= 1.5;
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    img.onload = function () {
        ctx.drawImage(img, 0, 0, width, height);

        let filename = T.docs[docid].title.split('.').reverse();
        filename.shift();
        let { start_time, end_time } = T.selections[docid];
        start_time = Math.round(start_time * 100000) / 100000;
        end_time = Math.round(end_time * 100000) / 100000;
        filename = filename.reverse().join('') + '.' + start_time + '-' + end_time + '.png';
        canvas.toBlob(canvasBlob => saveAs(canvasBlob, filename));
    }

    img.src = svgUrl;

}

function placeholder_on_unready(root, docid) {
    if (!T.docs[docid] || !get_data(docid)) {
        root.div({
            classes: ["loading-placement"],
            text: "Loading... If this is taking too long, try reloading the webpage, turning off AdBlock, or reuploading this data file"
        });

        return true;
    }

    return false;
}

function render_hamburger(root, doc) {

    let dlBtn = root.button({
        classes: ['dl-btn'],
        events: {
            onclick: ev => {
                // might change this later, for now button does nothing
            },
        }
    })

    dlBtn.img({ attrs: { src: "ellipsis.svg" } });

    let dlDropdown = dlBtn.ul({ classes: ['dl-dropdown rightedge'] });

    let pregen_downloads = ['transcript', 'align', 'pitch', 'csv', 'mat', ];

    let filename = doc.title.split('.').reverse()
    filename.shift()
    filename = filename.reverse().join('')

    pregen_downloads.forEach(name => {
        if (!doc[name]) {
            return;
        }

        let out_filename = filename + '-' + name + '.' + doc[name].split('.').reverse()[0];

        let displayName = {
            csv: 'Drift Data (.csv)',
            mat: 'Voxit Data (.mat)',
            align: 'Gentle Align (.json)',
            pitch: 'Drift Pitch (.txt)',
            transcript: 'Audio Transcript (.txt)'
        }

        dlDropdown.li({
            id: `ham-${name}-${doc.id}`,
        }).a({
            text: "Download - " + displayName[name],
            classes: ['action-btn'],
            attrs: {
                href: '/media/' + doc[name],
                _target: '_blank',
                download: out_filename
            }
        });
    })

    dlDropdown.li({
        id: `ham-voxitcsv-${doc.id}`,
    }).button({
        text: "Download - Voxit Data (.csv)",
        classes: ['action-btn'],
        events: {
            onclick: ev => {
                ev.preventDefault();
                download_voxitcsv(doc);
            }
        }
    });

    dlDropdown.li({
        id: `ham-del-${doc.id}`,
    }).button({
        text: "Delete Audioclip",
        classes: ['action-btn'],
        events: {
            onclick: ev => {
                ev.preventDefault();
                delete_action(doc);
            }
        }
    });

}

function set_active_doc(doc) {
    if (doc.id !== T.cur_doc) {
        T.cur_doc = doc.id;
        if (T.audio) T.audio.pause();

        T.audio = new Audio('/media/' + doc.path);
        T.audio.addEventListener("canplaythrough", () => {
            T.docs[doc.id].duration = T.audio.duration;
            render_opened_docitem(T.docs[doc.id]);
        });

        if (T.razors[doc.id])
            T.audio.currentTime = T.razors[doc.id];
    }
}

function got_files(files) {
    if (files.length > 0) {
        for (var i = 0; i < files.length; i++) {

            (function (file) {

                var drift_doc = {
                    title: file.name,
                    size: file.size,
                    date: new Date().getTime() / 1000
                };

                FARM.post_json("/_rec/_create", drift_doc, (ret) => {

                    T.docs[ret.id] = ret;
                    T.opened[ret.id] = true;
                    render();

                    attach.put_file(file,
                        x => {
                            console.log('done', x);

                            FARM.post_json("/_rec/_update", {
                                id: ret.id,
                                path: x.path
                            }, (u_ret) => {
                                Object.assign(T.docs[ret.id], u_ret.update);
                                render();

                                // Immediately trigger a pitch trace
                                FARM.post_json("/_pitch", { id: ret.id }, (p_ret) => {
                                    console.log("pitch returned", p_ret);
                                });

                                // ...and RMS
                                FARM.post_json("/_rms", { id: ret.id }, (c_ret) => {
                                    console.log("rms returned", c_ret);
                                });

                            });

                        },
                        p => {
                            T.docs[ret.id].upload_status = p / ret.size;
                            console.log("upload_status", T.docs[ret.id].upload_status);
                            render();
                        });

                });

            })(files[i]);
        }
    }
}

function get_docs() {
    let dateSorted = sort_docs(Object.keys(T.docs));
    dateSorted.forEach((x, i) => {
        x.order = T.docs[x.id].order = i + 1;
    });
    return dateSorted;
}

function get_opened_docs() {
    return sort_docs(Object.keys(T.opened));
}

// sort by "order" property. If it doesn't have an order property, it means the document was just added, 
// so those without the "order" property are prioritized first
function sort_docs(docIds) {
    return docIds
        .map((x) => Object.assign({}, T.docs[x], { id: x }))
        .sort((x, y) => {
            if (!x.order && !y.order) return x.date > y.date ? -1 : 1;
            if ((x.order === undefined) !== (y.order === undefined))
                return y.order ? -1 : 1;
            return x.order - y.order;
        });
}

function toggle_playpause() {
    if (T.audio && has_data(T.cur_doc)) {
        if (!T.razors[T.cur_doc] && T.selections[T.cur_doc])
            T.audio.currentTime = T.selections[T.cur_doc].start_time;
        if (T.audio.paused) {
            // do rounding for conditional because comparing floats is finnicky
            let { start_time, end_time } = T.selections[T.cur_doc];
            start_time = Math.round(start_time * 10000) / 10000;
            end_time = Math.round(end_time * 10000) / 10000;
            const ct = Math.round(T.audio.currentTime * 10000) / 10000;

            if (ct > end_time
                || ct < start_time) {
                console.log(T.selections[T.cur_doc].start_time, T.audio.currentTime, T.selections[T.cur_doc].end_time);
                let segments = (get_cur_align(T.cur_doc) || {}).segments;
                if (segments) {
                    let start = T.audio.currentTime, end = Math.min(start + 20, T.audio.duration);
                    T.selections[T.cur_doc] = { start_time: start, end_time: end };
                }
            }
            T.audio.play();
        }
        else {
            T.audio.pause();
        }
        render_opened_docitem(T.docs[T.cur_doc]);
    }
}

function has_data(docid) {
    let meta = T.docs[docid];
    if (!meta) { return }

    return meta.pitch && meta.align && meta.rms;
}

function cached_get_url(url, proc_fn) {
    D.urls = D.urls || {};
    if (D.urls[url + '_status'] != C.STATUS.READY) {
        if (D.urls[url + '_status'] != C.STATUS.LOADING) {
            D.urls[url + '_status'] = C.STATUS.LOADING;

            FARM.get(url, (ret) => {
                if (proc_fn) {
                    ret = proc_fn(ret);
                }
                D.urls[url] = ret;
                D.urls[url + '_status'] = C.STATUS.READY;
                render();	// XXX
            });
        }
        return { loading: true };
    }
    return D.urls[url];
}

// legacy
function get_cur_pitch(id) {
    return (get_data(id || T.cur_doc) || {}).pitch
}
function get_cur_align(id) {
    return (get_data(id || T.cur_doc) || {}).align
}
function get_cur_rms(id) {
    return (get_data(id || T.cur_doc) || {}).rms
}

function get_data(docid) {
    // or null if they're not loaded...

    let meta = T.docs[docid];
    if (!meta) { return }

    if (!meta.pitch) { return }
    let pitch = cached_get_url('/media/' + meta.pitch, parse_pitch);
    if (pitch.loading) { return }

    if (!meta.align) { return }
    let align = cached_get_url('/media/' + meta.align, JSON.parse);
    if (align.loading) { return }

    if (!meta.rms) { return }
    let rms = cached_get_url('/media/' + meta.rms, JSON.parse);
    if (rms.loading) { return }

    return { pitch, align, rms }
}

function get_descriptions() {
    
        // TODO better way to do this?
        return {
            'WPM': 'The average number of words per minute. The transcript of the recording created by Gentle, corrected when necessary, produced the number of words read, which was divided by the length of the recording and normalized, if the recording was longer or shorter than one minute, to reflect the speaking rate for 60 seconds.',
            'Gentle_Pause_Count_>100ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
            'Gentle_Pause_Count_>500ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
            'Gentle_Pause_Count_>1000ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
            'Gentle_Pause_Count_>1500ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
            'Gentle_Pause_Count_>2000ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
            'Gentle_Pause_Count_>2500ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
            'Gentle_Long_Pause_Count_>3000ms': 'The number of pauses between words greater than 100, 500, 1000, and 2000 milliseconds, per minute, normalized for recording length. We do not consider pauses less than 100ms because fully continuous speech also naturally has such brief gaps in energy, nor do we consider pauses that exceed 1,999 ms (that is, 2 seconds), because they are quite rare within the reading of a poem.',
            'Gentle_Mean_Pause_Duration_(sec)': 'Average length of pauses',
            'Gentle_Pause_Rate_(pause/sec)': 'Average number of pauses greater than 100, 250 and 500 ms, normalized for recording length.',
            'Gentle_Complexity_All_Pauses': 'This measure is unitless, calculated using the Lempel-Ziv algorithm to estimate Kolomogorov complexity, also used for compression, as with gif or zip files. A higher value indicates less predictable & less repetitive pauses, normalized for audio length.',
            'Drift_f0_Mean_(hz)': 'Average Pitch. Mean f0, or the fundamental frequency, of a voice is sampled every 10 milliseconds, measured in Hertz (cycles per second), excluding outliers. This actually measures the number of times the vocal cords vibrate per second.',
            'Drift_f0_Range_(octaves)': 'Range of pitches measured in octaves, excluding outliers.',
            'Drift_f0_Mean_Abs_Velocity_(octaves/sec)': 'Speed of f0 in octaves per second. This is simply a measure of how fast pitch is changing.',
            'Drift_f0_Mean_Abs_Accel_(octaves/sec^2)': 'Acceleration of f0 in octaves per second squared. Acceleration is the rate of change of pitch velocity, that is how rapidly the changes in pitch change, which we perceive as the lilt of a voice.',
            'Drift_f0_Entropy': 'or entropy for f0, indicating the predictability of pitch patterns. Entropy is an information theoretic measure of predictability',
        };
}

function get_selection(id) {

    if (T.selections[id] === undefined) {
        let segments = (get_cur_align(id) || {}).segments;

        if (segments === undefined)
            return

        T.selections[id] = { 
            start_time:     segments[0].start, 
            end_time:       Math.min(segments[0].start + 20, segments[segments.length - 1].end) 
        };
    }
    
    return T.selections[id]
}

function splitString(str, len, maxlines) {
    let strs = [], i = 0, j = len;

    while (j < str.length && strs.length < maxlines - 1) {
        if (str.charAt(j) !== ' ') {
            j++;
            continue;
        }
        strs.push(str.substring(i, j));
        i = j + 1;
        j = i + len;
    }
    if (j >= str.length && strs.length < maxlines)
        strs.push(str.substring(i, j));
    else if (j != str.length)
        strs[strs.length - 1] += '...';

    return strs.join('\n');
}

////////////// Math utility functions //////////////

function parse_pitch(pitch) {
    return pitch.split('\n')
        .filter((x) => x.length > 5)
        .map((x) => Number(x.split(' ')[1]));
}

function smooth(seq, N) {
    N = N || 5;

    let out = [];

    for (let i = 0; i < seq.length; i++) {

        let npitched = 0;
        let v = 0;

        for (let j = 0; j < N; j++) {
            let j1 = Math.max(0, Math.min(j + i, seq.length - 1));
            var v1 = seq[j1];
            if (v1 > 20) {
                v += v1;
                npitched += 1;
            }
            else if (j1 >= i) {
                // Hit gap after idx
                break
            }
            else if (j1 <= i) {
                // Hit gap before/on: reset
                npitched = 0;
                v = 0;
            }
        }
        if (npitched > 1) {
            v /= npitched;
        }

        out.push(v);
    }

    return out;
}

function derivative(seq) {
    let out = [];
    for (let i = 0; i < seq.length; i++) {
        let s1 = seq[i];
        let s2 = seq[i + 1];
        if (s1 && s2) {// && s1 > 20 && s2 > 20) {
            out.push(s2 - s1);
        }
        else {
            out.push(0)
        }
    }
    return out;
}

function get_distribution(seq, name) {
    name = name || '';

    seq = Object.assign([], seq).sort((x, y) => x > y ? 1 : -1);

    if (seq.length == 0) {
        return {}
    }

    // Ignore outliers
    seq = seq.slice(Math.floor(seq.length * 0.09),
        Math.floor(seq.length * 0.91));

    let out = {};
    out[name + 'mean'] = seq.reduce((acc, x) => acc + x, 0) / seq.length;
    out[name + 'percentile_9'] = seq[0];
    out[name + 'percentile_91'] = seq[seq.length - 1];
    out[name + 'range'] = seq[seq.length - 1] - seq[0];

    return out;
}

function time_stats(wdlist) {
    // Analyze gaps
    let gaps = wdlist.filter((x) => x.type == 'gap');

    let gap_distr = get_distribution(gaps.map((x) => x.end - x.start), 'gap_')

    let pgap = gaps.length / wdlist.length;

    // ...and durations
    let phones = wdlist.filter((x) => x.phones)
        .reduce((acc, x) => acc.concat(x.phones.map((p) => p.duration)), []);
    let phone_distr = get_distribution(phones, 'phone_');

    return Object.assign({ pgap }, gap_distr, phone_distr);
}

function pitch_stats(seq) {

    let smoothed = smooth(seq);

    let velocity = derivative(smoothed);
    let acceleration = derivative(velocity);

    let pitched = seq.filter((p) => p > 20);
    if (pitched.length == 0) {
        return
    }

    let pitch_distr = get_distribution(pitched, 'pitch_');

    let acceled = acceleration.filter((p) => Math.abs(p) > 0.1);
    let accel_distr = get_distribution(acceled, 'accel_');
    accel_distr['accel_norm'] = acceled.reduce((acc, x) => acc + Math.abs(x), 0) / acceled.length; // XXX: percentiles...

    return Object.assign({
        smoothed,
        velocity,
        acceleration
    },
        pitch_distr, accel_distr);
}

function delete_action(doc) {
    FARM.post_json("/_rec/_remove", { id: doc.id }, (ret) => {
        delete T.docs[ret.remove];
        delete T.opened[ret.remove];
        render();
    });
}

function download_voxitcsv(doc) {
    let csvContent = voxit_to_tab_separated(doc, filter_stats(get_measures_fullTS(doc.id)));
    csvContent = csvContent.replace(/\t/g, ',')
    let filename = doc.title.split('.').reverse()
    filename.shift()

    let out_filename = filename + '-voxitcsv.csv';

    saveAs(new Blob([csvContent]), out_filename);
}

function fr2x(fr) {
    return t2x(fr / 100.0);
}
function t2x(t) {
    return T.LPAD + t2w(t);
}
function x2t(x) {
    return (x - T.LPAD) / T.XSCALE;
}
function t2w(t) {
    return t * T.XSCALE;
}

function pitch2y(p, p_h) {
    if (p == 0) {
        return p;
    }

    // -- Linear
    //return T.PITCH_H - p;

    // -- Logscale
    // This is the piano number formula
    // (https://en.wikipedia.org/wiki/Piano_key_frequencies)
    // n = 12 log2(f/440hz) + 49
    return (-60 * Math.log2(p / 440));
}

///////////////// end Math utility functions /////////////////////