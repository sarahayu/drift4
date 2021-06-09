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

function cached_get_url(url, proc_fn) {
    D.urls = D.urls || {};
    if(D.urls[url + '_status'] != C.STATUS.READY) {
	      if(D.urls[url + '_status'] != C.STATUS.LOADING) {
	          D.urls[url + '_status'] = C.STATUS.LOADING;

	          FARM.get(url, (ret) => {
		            if(proc_fn) {
		                ret = proc_fn(ret);
		            }
		            D.urls[url] = ret;
		            D.urls[url + '_status'] = C.STATUS.READY;
		            render();	// XXX
	          });
	      }
	      return {loading: true};
    }
    return D.urls[url];
}

// legacy
function get_cur_pitch(id) {
    return (get_data(id || T.cur_doc)||{}).pitch
}
function get_cur_align(id) {
    return (get_data(id || T.cur_doc)||{}).align
}
function get_cur_rms(id) {
    return (get_data(id || T.cur_doc)||{}).rms
}

function has_data(docid) {
    let meta = T.docs[docid];
    if(!meta) { return }

    return meta.pitch && meta.align && meta.rms;
}

function get_data(docid) {
    // or null if they're not loaded...

    let meta = T.docs[docid];
    if(!meta) { return }

    if(!meta.pitch) { return }
    let pitch = cached_get_url('/media/' + meta.pitch, parse_pitch);
    if(pitch.loading) { return }

    if(!meta.align) { return }
    let align = cached_get_url('/media/' + meta.align, JSON.parse);
    if(align.loading) { return }

    if(!meta.rms) { return }
    let rms = cached_get_url('/media/' + meta.rms, JSON.parse);
    if(rms.loading) { return }

    return {pitch, align, rms}
}


T.XSCALE = 300;
T.PITCH_H= 250;
T.LPAD = 0;
T.MAX_A= 15;

if(!T.docs) {
    T.docs = {};
    reload_docs();
}
if(!T.active) {
    T.active = {};
}
if(!T.opened) {
    T.opened = {};
}
if(!T.razors) {
    T.razors = {};
}
if(!T.selections) {
    T.selections = {};
}
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


function get_docs() {
    return Object.keys(T.docs)
        .map((x) => Object.assign({}, T.docs[x], {id: x}))
        .sort((x,y) => x.date > y.date ? -1 : 1);
}
function set_active_doc(doc) {
    if(doc.id !== T.cur_doc) {
        T.cur_doc = doc.id;
        if (T.audio) T.audio.pause();
        
        T.audio = new Audio('/media/' + doc.path);
        T.audio.addEventListener("canplaythrough", () => {
            T.docs[doc.id].duration = T.audio.duration;
            render();
        });
        
        if (T.razors[doc.id])
            T.audio.currentTime = T.razors[doc.id];
    }
}

function render_uploader(root) {

    get_docs()
        .forEach(doc => {
            let listItem = root.li({ 
                id: doc.id + '-listwrapper',
                classes: ['list-item', T.opened[doc.id] ? 'active' : ''],
                events: {
                    onclick: ev => {
                        ev.currentTarget.classList.toggle('active');
                        if (T.opened[doc.id])
                        {
                            delete T.opened[doc.id];
                            if (T.cur_doc === doc.id)
                            {
                                delete T.cur_doc;
                                if (T.audio) T.audio.pause();
                                delete T.audio;
                            }
                        }
                        else
                        {
                            T.opened[doc.id] = true;
                            if (has_data(doc.id)) {
                                T.active[doc.id] = T.opened[doc.id];
                                set_active_doc(doc);
                            }
                        }
                        render();
                    }
                }
            });

            listItem.img({ attrs: { src: "hamburger.svg", alt: "drag indicator" } });
            listItem.span({ text: doc.title });
            listItem.button({ 
                classes: ["deleter"],
                events: {
                    onclick: evnt => {
                        evnt.stopPropagation();
                        delete_action(doc);
                    }
                }
             })
            .img({ attrs: { src: "delete.svg", alt: "delete icon" } });
        })

}

function got_files(files) {
    if(files.length > 0) {
        for(var i=0; i<files.length; i++) {

            (function(file) {

                var drift_doc = {
                    title: file.name,
                    size: file.size,
                    date: new Date().getTime()/1000
                };

                FARM.post_json("/_rec/_create", drift_doc, (ret) => {

                    T.docs[ret.id] = ret;
                    T.opened[ret.id] = true;
                    render();

                    attach.put_file(file, function(x) {
                        console.log('done', x);

                        FARM.post_json("/_rec/_update", {
                            id: ret.id,
                            path: x.path
                        }, (u_ret) => {
                            Object.assign(T.docs[ret.id], u_ret.update);
                            render();

                            // Immediately trigger a pitch trace
                            FARM.post_json("/_pitch", {id: ret.id}, (p_ret) => {
                                console.log("pitch returned", p_ret);
                                set_active_doc(T.docs[ret.id]);
                            });

			                      // ...and RMS
			                      FARM.post_json("/_rms", {id: ret.id}, (c_ret) => {
				                        console.log("rms returned", c_ret);
			                      });

                        });

                    }, function(p, cur_uploading) {
                        T.docs[ret.id].upload_status = p / ret.size;
                        console.log("upload_status", T.docs[ret.id].upload_status);
                        render();
                    });

                });

            })(files[i]);
        }
    }
}

function render_doclist(root) {
    // XXX: preload list of 
    if (get_docs().length == 0) document.getElementById('nofiles').classList.add('show');
    else 
    {
        document.getElementById('nofiles').classList.remove('show');
        if (Object.keys(T.opened).length === 0) document.getElementById('noneselected').classList.add('show');
        else document.getElementById('noneselected').classList.remove('show');
    }

    get_docs()
        .forEach((doc) => {

            // doc ready!!

            if (!T.opened[doc.id]) return;

            let is_pending = !has_data(doc.id);

            let docitem = root.div({
                id: doc.id,
                classes: ['driftitem']
            });


            // Top bar
            let docbar = docitem.div({
                id: doc.id + "-bar",
                classes: ['docbar']
            });

            docbar.img({ attrs: { src: "tictactoe.svg" } });

            // Title
            docbar.div({
                id: doc.id + '-name',
                classes: ['doc-name'],
                text: doc.title
            });

            render_hamburger(docbar, doc);

            if (is_pending) {
                render_paste_transcript(docitem.div({ classes: ['driftitem-content'] }), doc);
            }
            else {
                // Expand.
                let content = docitem.div({ classes: ['driftitem-content'] })

                let section1 = content.section({
                    id: 'sec1',
                    classes: ['driftitem-top']
                }), section2 = content.section({
                    id: 'sec2',
                    classes: ['detail-wrapper']
                }), section3 = content.section({
                    id: 'sec3',
                    classes: ['table-section']
                })

                let playBtn = section1.button({
                    classes: ['play-btn'],
                    events: {
                        onclick: ev => {
                            set_active_doc(doc);
                            toggle_playpause();
                        }
                    },
                })

                playBtn.img({ attrs: { src: "play-icon.svg"} });
                playBtn.span({ text: (T.cur_doc != doc.id || !T.audio || T.audio.paused) ? 'play' : 'pause' });

                let ov_div = section1.div({
                    id: doc.id + '-ovdiv',
                    classes: ['overview']
                });

                ov_div.p({ text: "Drag to select a region" })
                render_overview(ov_div.div({ id: doc.id + '-ov-wrapper', classes: ['overview-wrapper'] }), doc);

                let timeframeInfo = section1.div({ classes: ['timeframe-wrapper'] });

                let det_div = section2.div({
                    id: doc.id + '-detdiv',
                    classes: ['detail']
                });

                if (!(doc.id in T.selections)) {
                    let segments = (get_cur_align(doc.id) || {}).segments;
                    if (segments)
                    {
                        let start = segments[0].start, end = Math.min(start + 20, segments[segments.length - 1].end);
                        T.selections[doc.id] = { start_time: start, end_time: end };
                    }
                }

                let { start_time, end_time } = T.selections[doc.id] || {};

                render_detail(det_div, doc, start_time, end_time);

                render_stats(section3.div({ classes: ['table-wrapper'] }), timeframeInfo, doc, start_time, end_time);

                section3.span({ text: '*vocal duration that corresponds to the transcript' });
            }


	      })
}
function render_stats(mainTableRoot, timeframeRoot, doc, start, end) {

    let uid = doc.id + '-' + start + '-' + end;
    let tableDiv = mainTableRoot.div({ 
        classes: ['table-wrapper'],
    })
    let table = tableDiv.table({
        classes: ['stat-table drift-table'],
    })

    let headers = table.tr({
        classes: ['stat-header']
    }), 
    datarow = table.tr({ id: uid + '-row1' }), 
    datarow2 = table.tr({ id: uid + '-row2' });

    headers.th({})
    datarow.th({ text: "full recording duration*" })
    datarow2.th({ text: "selection" })

    let timeframe = timeframeRoot.table({ classes: ['timeframe-table drift-table'] });
    let tfh = timeframe.tr({ id: uid + '-tfh' }),
        tfb = timeframe.tr({ id: uid + '-tfb' });

    let segments = (get_cur_align(doc.id) || {}).segments;
    let fullTSDuration;
    let url, timedURL;
    if (segments)
    {
        fullTSDuration = segments[segments.length - 1].end - segments[0].start;
        url = '/_measure?id=' + doc.id, timedURL = url;
        url += `&start_time=${ segments[0].start }&end_time=${ segments[segments.length - 1].end }`;
        
        if(start) {
            timedURL += '&start_time=' + start;
        }
        if(end) {
            timedURL += '&end_time=' + end;
        }
        
        if (!T.DRAGGING)
        {
            T.docs[doc.id].stats = cached_get_url(url, JSON.parse).measure;
            T.docs[doc.id].timedStats = cached_get_url(timedURL, JSON.parse).measure;
        }
    }
    
    Object.entries({
        'full recording duration*': Math.round(fullTSDuration * 10) / 10 + 's', 
        'selection start': (Math.round(start * 10) / 10 || '0') + 's', 
        'selection end': Math.round(end * 10) / 10 + 's', 
        'selection length': Math.round((end - start) * 10) / 10 + 's'
    }).forEach(([label, data], i) => {
        tfh.th({ text: label });
        if (i == 1 || i == 2)
        {
            tfb.td({ id: uid + '-tfb' + i, classes: ['editable'] }).input({ 
                attrs: { value: data, step: 0.1 },
                events: {
                    onkeydown: ev => {
                        if (ev.keyCode == 13)
                        {
                            ev.preventDefault();
                            ev.currentTarget.blur();
                        }
                    },
                    onblur: ev => {
                        let { value } = ev.currentTarget;
                        value = parseFloat(value);
                        const [thisTime, otherTime] = i == 1 ? ['start_time','end_time'] : ['end_time','start_time'];
                        let error;

                        if ((!value && value != 0) || value < 0) error = 'Time must be positive and non-null!';
                        else
                        {
                            if (T.selections[doc.id][thisTime] != value)
                            {
                                let otherValue = T.selections[doc.id][otherTime];
                                if ((i == 1 && value >= otherValue) || (i == 2 && value <= otherValue)) error = 'Invalid range!';
                                else if (Math.abs(value - otherValue) > 30 || Math.abs(value - otherValue) < 0.2) error = 'Range must be between 0.2s and 30s';
                                else
                                {
                                    ev.currentTarget.value = T.selections[doc.id][thisTime] = Math.min(value, T.docs[doc.id].duration); 
                                    render();
                                }
                            }
                        }
                         
                        if (error)
                        {
                            ev.currentTarget.value = T.selections[doc.id][thisTime];
                            alert(error);
                        }
                        ev.currentTarget.value = Math.round(ev.currentTarget.value * 10) / 10;
                        ev.currentTarget.setAttribute("type", "text");
                        ev.currentTarget.value += 's';
                    },
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
    });
    
    const { stats, timedStats } = T.docs[doc.id];
    if(stats) {

        let keys = Object.keys(stats).slice(2);

        // Header
        keys
            .forEach((key,idx) => {
                new PAL.Element('th', {
                    parent: headers,
                    id: key + '-h',
                    text: key.replace(/_/g, ' ')
                })
                new PAL.Element('td', {
                    parent: datarow,
                    id: key + '-d',
                    text: '' + Math.round(stats[key] * 100) / 100
                })
                new PAL.Element('td', {
                    parent: datarow2,
                    id: key + '-d',
                    text: '' + (timedStats ? Math.round(timedStats[key] * 100) / 100 : 'n/a')
                })
            })
        
            
        mainTableRoot.button({ 
            text: 'Copy to Clipboard', 
            classes: ['copy-btn'],
            events: {
                onclick: () => {
                    let cliptxt = '\t';
                    keys.forEach((key) =>{
                        cliptxt += key + '\t';
                    });
                    cliptxt += "start_time\tend_time\t"
                    cliptxt += '\nfull clip\t';
                    keys.forEach((key) =>{
                        cliptxt += stats[key] + '\t';
                    });

                    cliptxt += segments[0].start + '\t' + segments[segments.length - 1].end + '\t';
                    cliptxt += '\nselection\t';
                    keys.forEach((key) =>{
                        cliptxt += timedStats[key] + '\t';
                    });
                    cliptxt += start + '\t' + end + '\t';
                    cliptxt += '\n';    

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
    else {
        tableDiv.div({ text: "Loading...", classes: ["table-loading"] })
    }

}

function render_paste_transcript(root, doc) {

    let docid = doc.id;

    const readyForTranscript = !(doc.upload_status && !doc.path);

    if (readyForTranscript)
        root.textarea({
            id: 'tscript-' + docid,
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
        classes: ["setts-btn"],
        attrs: { disabled: readyForTranscript ? null : true },
        events: {
            onclick: function(ev) {

                ev.preventDefault();
                ev.stopPropagation();

                // prevent dual-submission...
                this.disabled = true;
                this.textContent = "aligning transcript...";

                document.getElementById('tscript-' + docid).disabled = true;

                var txt = document.getElementById('tscript-' + docid).value;
                if(txt) {
                    var blob = new Blob([txt]);
                    blob.name = "_paste.txt";
                    attach.put_file(blob, function(ret) {
                        // Uploaded transcript!
                        FARM.post_json("/_rec/_update", {
                            id: docid,
                            transcript: ret.path
                        }, (ret) => {
                            Object.assign(T.docs[docid], ret.update);
                            render();

                            // Immediately trigger an alignment
                            FARM.post_json("/_align", {id: docid}, (p_ret) => {
                                console.log("align returned");

				                        // Trigger CSV & MAT computation (assuming pitch also there)
				                        FARM.post_json("/_csv", {id: docid}, (c_ret) => {
				                            console.log("csv returned");
				                        });
				                        FARM.post_json("/_mat", {id: docid}, (c_ret) => {
				                            console.log("mat returned");
				                        });
                            });


                        });
                    });
                }
            }
        }
    });
    
    if (doc.upload_status && !doc.path) {
        // Show progress
        new PAL.Element("progress", {
            id: doc.id + '-progress',
            parent: bottomWrapper,
            attrs: {
                max: "100",
                value: "" + Math.floor((100 * doc.upload_status))
            },
        })
    }

    if (doc.align_px && !doc.align) {
        // Show progress
        new PAL.Element("progress", {
            id: doc.id + '-align-progress',
            parent: bottomWrapper,
            attrs: {
                max: "100",
                value: "" + Math.floor((100 * doc.align_px))
            },
        })
    }
}

function parse_pitch(pitch) {
    return pitch.split('\n')
        .filter((x) => x.length > 5)
        .map((x) => Number(x.split(' ')[1]));
}

function smooth(seq, N) {
    N = N || 5;

    let out = [];

    for(let i=0; i<seq.length; i++) {

	      let npitched = 0;
	      let v = 0;

	      for(let j=0; j<N; j++) {
	          let j1 = Math.max(0, Math.min(j+i, seq.length-1));
	          var v1 = seq[j1];
	          if(v1 > 20) {
		            v += v1;
		            npitched += 1;
	          }
	          else if(j1 >= i) {
		            // Hit gap after idx
		            break
	          }
	          else if(j1 <= i) {
		            // Hit gap before/on: reset
		            npitched=0;
		            v=0;
	          }
	      }
	      if(npitched > 1) {
	          v /= npitched;
	      }

	      out.push(v);
    }

    return out;
}

function derivative(seq) {
    let out = [];
    for(let i=0; i<seq.length; i++) {
	      let s1 = seq[i];
	      let s2 = seq[i+1];
    	  if(s1 && s2) {// && s1 > 20 && s2 > 20) {
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

    seq = Object.assign([], seq).sort((x,y) => x > y ? 1 : -1);

    if(seq.length==0) {
	      return {}
    }

    // Ignore outliers
    seq = seq.slice(Math.floor(seq.length*0.09),
		                Math.floor(seq.length*0.91));

    let out = {};
    out[name + 'mean'] = seq.reduce((acc,x)=>acc+x,0) / seq.length;
    out[name + 'percentile_9'] = seq[0];
    out[name + 'percentile_91'] = seq[seq.length-1];
    out[name + 'range'] = seq[seq.length-1] - seq[0];

    return out;
}

function time_stats(wdlist) {
    // Analyze gaps
    let gaps = wdlist.filter((x) => x.type=='gap');

    let gap_distr = get_distribution(gaps.map((x) => x.end-x.start), 'gap_')

    let pgap = gaps.length / wdlist.length;

    // ...and durations
    let phones = wdlist.filter((x) => x.phones)
	      .reduce((acc,x) => acc.concat(x.phones.map((p) => p.duration)), []);
    let phone_distr = get_distribution(phones, 'phone_');

    return Object.assign({pgap}, gap_distr, phone_distr);
}

function pitch_stats(seq) {

    let smoothed = smooth(seq);

    let velocity = derivative(smoothed);
    let acceleration = derivative(velocity);

    let pitched=seq.filter((p) => p>20);
    if(pitched.length==0) {
	      return
    }

    let pitch_distr = get_distribution(pitched, 'pitch_');

    let acceled=acceleration.filter((p) => Math.abs(p)>0.1);
    let accel_distr = get_distribution(acceled, 'accel_');
    accel_distr['accel_norm'] = acceled.reduce((acc,x)=>acc+Math.abs(x),0) / acceled.length; // XXX: percentiles...

    return Object.assign({smoothed,
			                    velocity,
			                    acceleration},
			                   pitch_distr, accel_distr);
}

function render_pitch(root, id, seq, attrs) {
    // Draw the entire pitch trace
    let ps = '';
    let started=false;
    seq
	      .forEach((p,p_idx) => {
	          if(p > 0) {
		            if(!started) {
		                ps += 'M ';
		            }
		            ps += '' + fr2x(p_idx) + ',' + (pitch2y(p)) + ' ';
		            started=true;
	          }
	          else {
		            started=false;
	          }
	      });

    root.path({
	      id: id,
	      attrs: Object.assign({
	          d: ps,
	          'stroke-width': 1,
	          fill: 'none',
              'stroke-linecap': 'round'
	      }, attrs||{})
    });

}

function render_detail(root, doc, start_time, end_time) {
    if(!render_is_ready(root, doc.id)) {
	      return
    }

    root._attrs.classes.push('loaded');
    let segs = get_cur_align(doc.id).segments;
    let duration = end_time - start_time;

    const seg_w = t2x(duration);

    let xAxisSvg = root.svg({
        id: doc.id + '-axis-svg-',
        attrs: {
            width: 50,
            height: T.PITCH_H + 1,  /* 1 additional pixel so right border perfectly ends on the bottom of the y-axis */
            class: 'x-axis',
        },
    })

    xAxisSvg.line({
        attrs: {
            'stroke-width': 2,
            stroke: '#DCDCDC',
            x1: 49,            
            y1: 0,
            x2: 49,
            y2: T.PITCH_H + 1,
        }
    })

    let mainGraphWrapper = root.div({ classes: ['main-graph-wrapper'] });
    let svg = mainGraphWrapper.svg({
	      id: doc.id + '-svg-',
	      attrs: {
	          width: seg_w,
	          height: T.PITCH_H + 35
	      },
	      events: {
	          onclick: (ev) => {
		            ev.preventDefault();

		            // Seek!
		            let t = start_time + x2t(ev.offsetX);
		            T.razors[doc.id] = t;
		            set_active_doc(doc);
		            T.audio.currentTime = t;
		            render();
	          },
              onmousemove: ev => {
                    T.razors[doc.id + '-hover'] = start_time + x2t(ev.offsetX);
		            render();
              },
              onmouseleave: ev => {
                    delete T.razors[doc.id + '-hover'];
                    render();
              }
	      }
    });
   
   svg.line({id: doc.id + '-seg-' + '-axis-0',
   attrs: {
       x1: 0,
       y1: T.PITCH_H,
       x2: seg_w,
       y2: T.PITCH_H,
       'stroke-width': 2,
       stroke: '#DCDCDC'
   }})

    // Draw axes
    var colors =  { 50: "#DADADA", 100: "#E0E0E0", 200: "#E5E5E5", 400: "#F0F0F0" };
    let lastYPx = T.PITCH_H;
    for (let yval = 50; yval <= 400; yval += 50) {
        var y_px = pitch2y(yval);
        let color = colors[yval];

        // add color change for desired intervals
        if(color) {

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

            xAxisSvg.text({
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
    
        svg.line({id: doc.id + '-seg-' + '-axis-' + yval,
        attrs: {
            x1: 0,
            y1: y_px,
            x2: seg_w,
            y2: y_px,
            "stroke-width": color ? 1 : 0.5,
            stroke: '#DCDCDC',
        }});
    }

    // ...and x-axis
    for(let x=Math.ceil(start_time); x<end_time; x++) {
        if (x == 0) continue;
        var x_px = t2x(x - start_time);

	      svg.line({id: doc.id + '-seg-' + '-xaxis-' + x,
		              attrs: {
		                  x1: x_px,
		                  y1: 0,
		                  x2: x_px,
		                  y2: T.PITCH_H,
		                  stroke: '#DCDCDC'
		              }})
	      svg.text({id: doc.id + '-seg-' + '-xaxistxt-' + x,
		              text: '' + x,
		              attrs: {
		                  x: x_px - 2,
		                  y: T.PITCH_H + 16,
		                  class: 'axis',
		                  fill: '#3B5161'
		              }})
    }

    let seq_stats = pitch_stats(
	      get_cur_pitch(doc.id).slice(Math.round(start_time*100),
				                            Math.round(end_time*100)));

    if(seq_stats) {
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

    // Draw amplitude
    get_cur_rms(doc.id)
	      .slice(Math.round(start_time*100),
	             Math.round(end_time*100))
	      .forEach((r, r_idx) => {

	          let h = r * T.PITCH_H/5;
	          let cy = 9.25/10 * T.PITCH_H;

	          svg.line({id: doc.id + '-rms-'  + '-' + r_idx,
		                  attrs: {
			                    x1: fr2x(r_idx),
			                    y1: cy - (h/2),
			                    x2: fr2x(r_idx),
			                    y2: cy + (h/2),
			                    stroke: 'rgba(0,0,0,0.1)',
			                    'stroke-width': 2,
		                  }})
	      });

    // Draw each word
    segs.forEach((seg, seg_idx) => {
	      seg.wdlist.forEach((wd,wd_idx) => {

	          if(!wd.end) { return }

	          if(wd.start >= end_time || wd.end <= start_time) { return; }

	          if(wd.type == 'gap'){
		            svg.rect({id: doc.id + '-gap-' + seg_idx + '-' + wd_idx,
			                    attrs: {
			                        x: t2x(wd.start - start_time),
			                        y: 0,
			                        width: t2w(wd.end - wd.start),
			                        height: T.PITCH_H,
			                        fill: 'rgba(0,0,0,0.05)'
			                    }})

		            return
	          }

	          let wd_stats = pitch_stats(get_cur_pitch(doc.id).slice(Math.round(wd.start*100),
								                                                   Math.round(wd.end*100)));

	          svg.text({id: doc.id + '-txt-' + seg_idx + '-' + wd_idx,
		                  text: wd.word,
		                  attrs: {
			                    class: wd.type=='unaligned' ? 'unaligned' : 'word',
			                    x: t2x(wd.start - start_time),
			                    //y: pitch2y((wd_stats&&wd_stats.pitch_mean) || seq_stats.pitch_mean) - 2,
			                    y: Math.max(30, pitch2y((wd_stats&&wd_stats.pitch_percentile_91) || seq_stats.pitch_mean) - 2),
			                    fill: '#3B5161',
		                  }
		                 })
	      });
    });


    if(T.cur_doc == doc.id && T.razors[doc.id]) {
	      svg.rect({id: 'd-razor-' + doc.id,
		              attrs: {
		                  x: t2x(T.razors[doc.id] - start_time),
		                  y: 0,
		                  width: 2,
		                  height: T.PITCH_H,
		                  fill: T.razors[doc.id + '-hover'] ? 'rgba(128, 55, 43, 0.4)' : '#80372B'
		              }
		             });
    }

    if(T.razors[doc.id + '-hover'])
    {
        const hovX = t2x(T.razors[doc.id + '-hover'] - start_time);
        svg.rect({id: doc.id + '-d-razor-hover',
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

    let dl_btn = root.button({
        classes: ['dl-graph-btn'],
        events: {
            onclick: ev => {
                let container = ev.currentTarget.parentElement;
                let svg1 = container.children[0].cloneNode(true), svg2 = container.children[1].children[0].cloneNode(true);
                svg2.setAttribute("x", svg1.width.baseVal.value);
                let svgWhole = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svgWhole.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                svgWhole.setAttribute("style", `font-family: 'futura-pt', 'Helvetica', 'Arial', sans-serif; font-size: 14.4px;`);
                svgWhole.setAttribute("width", svg1.width.baseVal.value + svg2.width.baseVal.value);
                svgWhole.setAttribute("height", svg2.height.baseVal.value);
                svgWhole.appendChild(svg1);
                svgWhole.appendChild(svg2);
                let pitchLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                pitchLabel.textContent = 'pitch';
                pitchLabel.setAttribute('y', svg2.height.baseVal.value - 50);
                pitchLabel.setAttribute('style', 'font-weight: 600;');
                let pitchLabel2 = pitchLabel.cloneNode();
                pitchLabel2.textContent = '(hz)';
                pitchLabel2.setAttribute('dy', '1.1em');
                let secondsLabel = pitchLabel.cloneNode();
                secondsLabel.textContent = 'seconds';
                secondsLabel.setAttribute('x', 50);
                secondsLabel.setAttribute('y', svg2.height.baseVal.value - 20);
                svgWhole.appendChild(pitchLabel);
                svgWhole.appendChild(pitchLabel2);
                svgWhole.appendChild(secondsLabel);
                let razor = svgWhole.querySelector('#' + 'd-razor-' + doc.id);
                if (razor) razor.remove();
                
                // https://stackoverflow.com/questions/23218174/how-do-i-save-export-an-svg-file-after-creating-an-svg-with-d3-js-ie-safari-an
                // https://stackoverflow.com/questions/3975499/convert-svg-to-image-jpeg-png-etc-in-the-browser
                let svgBlob = new Blob([svgWhole.outerHTML], {type:"image/svg+xml;charset=utf-8"});
                let svgUrl = URL.createObjectURL(svgBlob);
                let img = new Image();
                let canvas = document.createElement('canvas');
                let [ width, height ] = [svg1.width.baseVal.value + svg2.width.baseVal.value, svg2.height.baseVal.value];
                width *= 1.5; height *= 1.5;
                canvas.width = width;
                canvas.height = height;
                let ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, width, height);
                img.onload = function() {
                    ctx.drawImage(img, 0, 0, width, height);
                          
                    let filename = doc.title.split('.').reverse();
                    filename.shift();
                    start_time = Math.round(start_time * 100000) / 100000;
                    end_time = Math.round(end_time * 100000) / 100000;
                    filename = filename.reverse().join('') + '.' + start_time + '-' + end_time + '.png';
                    canvas.toBlob(canvasBlob => saveAs(canvasBlob, filename));
                }

                img.src = svgUrl;

            }
        }
    });

    dl_btn.span({ text: "Download Graph" });
    dl_btn.img({ attrs: { src: 'download-icon.svg' } });

}

function render_overview(root, doc) {
    if(!render_is_ready(root, doc.id)) {
	      return
    }

    let align = get_cur_align(doc.id);
    let duration = T.docs[doc.id].duration;

    let width = duration * 10;
    // let width = (document.getElementById(root._id) || {}).clientWidth || document.body.clientWidth;
    let height = 50;

    let svg = root.svg({
	      id: doc.id + '-svg-overview',
	      attrs: {
	          width: width,
	          height: height,
	      },
	      events: {
	          onmousedown: (ev) => {
		            ev.preventDefault();

		            // Compute time for razor (XXX: make selection?)
		            let t1 = (ev.offsetX / width) * duration;
		            let t2 = t1;

                T.DRAGGING = true;

		            window.onmousemove = (ev) => {
		                t2 = (ev.offsetX / width) * duration;

		                if(Math.abs(t2 - t1) > 0.2) {

			                  let start = Math.min(t1, t2);
			                  let end = Math.max(t1, t2);

			                  // Limit to 30secs
			                  end = Math.min(start+30, end);

			                  T.selections[doc.id] = {
			                      start_time: start,
			                      end_time: end
			                  };

			                  render();
		                }
		                else {
			                  // if(doc.id in T.selections) {
			                  //     delete T.selections[doc.id];
			                  //     render();
			                  // }
		                }

		            }
		            window.onmouseup = (ev) => {
                    T.DRAGGING = false;

		                set_active_doc(doc);

		                if(Math.abs(t2 - t1) < 0.2) {
			                  // TODO: Seek audio
			                  T.razors[doc.id] = t2;
			                  T.audio.currentTime = t2;

		                }
			              render();

		                window.onmousemove = null;
		                window.onmouseup = null;
		            };
	          }
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

    // render word gaps on overview
    align.segments
        .forEach((seg, seg_idx) => {
            seg.wdlist.forEach((wd, wd_idx) => {
                if (!wd.end || !wd.start) { return }

                if (wd.type == 'gap') {
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
            })
        });
    
    // render simplified pitch trace on overview
    let seq_stats = pitch_stats(get_cur_pitch(doc.id));

    if (seq_stats) {
        let voiceStart;
        seq_stats.smoothed
            .forEach((p, p_idx) => {
                if (p > 0) {
                    if (!voiceStart) {
                        voiceStart = p_idx;
                    }
                }
                else {
                    if (p_idx - voiceStart > 20 && voiceStart) {

                        let voicedPeriod = get_cur_pitch(doc.id)
                            .slice(Math.floor(voiceStart), Math.floor(p_idx));
                        let pitch_mean = (pitch_stats(voicedPeriod) || {})['pitch_mean'];
                        if (pitch_mean) {

                            let y = pitch2y(pitch_mean) / 5;
                            svg.rect({
                                id: doc.id + '-word-' + p_idx,
                                attrs: {
                                    x: width * (voiceStart / 100 / duration),
                                    y: y,
                                    width: width * (p_idx / 100 - voiceStart / 100) / duration,
                                    height: 2,
                                    fill: '#E4B186'
                                }
                            })
                        }
                        voiceStart = false;
                    }
                }

            });


    }

    // render selection overlay
    if(T.selections[doc.id]) {
	      let sel = T.selections[doc.id];
          
        svg.rect({id: doc.id + '-o-selection-pre',
          attrs: {
              x: 0,
              y: 0,
              width: width * (sel.start_time / duration),
              height: height,
              fill: 'rgba(218,218,218,0.4)'
          }
         });
         svg.rect({id: doc.id + '-o-selection-post',
         attrs: {
             x: width * (sel.start_time / duration) + width * ((sel.end_time - sel.start_time) / duration),
             y: 0,
             width: width - (width * (sel.start_time / duration) + width * ((sel.end_time - sel.start_time) / duration)),
             height: height,
             fill: 'rgba(218,218,218,0.4)'
         }
         });

	      svg.rect({id: doc.id + '-o-selection',
		              attrs: {
		                  x: width * (sel.start_time / duration),
		                  y: 1,
		                  width: width * ((sel.end_time - sel.start_time) / duration),
		                  height: height - 2,
		                  stroke: 'rgba(128, 55, 43, 1)',
		                  'stroke-width': 1,
		                  fill: 'none',
                          rx: 2
		              }
		             });

        //   svg.line({
        //     id: doc.id + '-o-selection',
        //     attrs: {
        //         x1: Math.max(width * (sel.start_time / duration), 2), /* veeery particular, but take max and min for x2 so we can see the nice rounded svg edges */
        //         y1: height + 6,
        //         x2: Math.min(width * (sel.end_time / duration), width - 2),
        //         y2: height + 6,
        //         stroke: 'rgba(128, 55, 43, 1)',
        //         'stroke-width': 4,
        //         'stroke-linecap': 'round'
        //     }
        // })
    }

    if(T.cur_doc == doc.id && T.razors[doc.id]) {
	      svg.rect({id: doc.id + '-o-razor',
		              attrs: {
		                  x: width * (T.razors[doc.id] / duration),
		                  y: 0,
		                  width: 2,
		                  height: height,
		                  fill: 'rgba(128, 55, 43, 0.4)'
		              }
		             });
    }

    // ...and x-axis
    let last_x = 0;

    for(let x=0; x<duration; x+=1) {
        let show_secs = false;

        var x_px = width * (x/duration);
        if(x % 5 == 0 && x - last_x > 10) {
            last_x = x;
            show_secs = true;
        }
        
        if(show_secs) {
	          svg.text({id: doc.id + '-ov-' + '-xaxistxt-' + x,
		                  text: '' + x + 's',
		                  attrs: {
		                      x: x_px + 2,
		                      y: height - 2,
		                      class: 'axis',
		                      fill: '#3B5161',
                              opacity: 0.5
		                  }})
        }
    }

}

function render_is_ready(root, docid) {
    if(!T.docs[docid] || !get_data(docid) || !T.docs[docid].duration) {
        new PAL.Element("div", {
            parent: root,
            classes: ["loading-placement"],
            text: "Loading... If this is taking too long, try reuploading this data file"
        });

        return false;
    }
    
    return true;
}

function delete_action(doc) {
    FARM.post_json("/_rec/_remove", {id: doc.id}, (ret) => {
	      delete T.docs[ret.remove];
          delete T.opened[ret.remove];
	      render();
    });
}


function render_hamburger(root, doc) {
    
    let dlBtn = root.button({
        classes: ['dl-btn'],
        events: {
            onclick: ev => {
                console.log(doc.title);

                // might change this later, for now button does nothing
            },
        }
    })

    dlBtn.img({ attrs: { src: "ellipsis.svg" } });

    let dlDropdown = dlBtn.ul({ classes: ['dl-dropdown rightedge'] });

    let pregen_downloads = ['csv', 'mat', 'align', 'pitch'];
    pregen_downloads.forEach(name => {
        if (!doc[name]) {
            return;
        }
        let filename = doc.title.split('.').reverse()
        filename.shift()

        let out_filename = filename.reverse().join('') + '-' + name + '.' + doc[name].split('.')[1];

        dlDropdown.li({
            id: `ham-${name}-${doc.id}`,
        }).a({
            text: "download " + name,
            attrs: {
                href: '/media/' + doc[name],
                _target: '_blank',
                download: out_filename
            }
        });
    })
    
    dlDropdown.li({
        id: `ham-del-${doc.id}`,
    }).a({
        text: "delete audioclip",
        attrs: {
            href: '#'
        },
        events: {
            onclick: ev => {
                ev.preventDefault();
                delete_action(doc);
            }
        }
    });
    
}

function render() {

    var fileList = new PAL.ExistingRoot("div", { id: "file-list"}),
        doclistArea = new PAL.ExistingRoot("main", { id: "doclist-area" })
    render_uploader(fileList);
    render_doclist(doclistArea);
    
    fileList.show();
    doclistArea.show();
}

function fr2x(fr) {
    return t2x(fr/100.0);
}
function t2x(t) {
    return T.LPAD + t2w(t);
}
function x2t(x) {
    return (x - T.LPAD)/T.XSCALE;
}
function t2w(t) {
    return t*T.XSCALE;
}


function pitch2y(p, p_h) {
    if(p == 0) {
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
function toggle_playpause() {
	  if(T.audio && has_data(T.cur_doc)) {
          if (!T.razors[T.cur_doc])
            T.audio.currentTime = get_cur_align(T.cur_doc).segments[0].start;
	      if(T.audio.paused) {
		        T.audio.play();
	      }
	      else {
		        T.audio.pause();
	      }
        render();
	  }
}
window.onkeydown = (ev) => {
    // XXX: Make sure we're not editing a transcript.
    if(ev.target.tagName == 'TEXTAREA') {
        return;
    }
    if(ev.key == ' ') {
	      ev.preventDefault();
        toggle_playpause();
    }
}

function tick() {
    if(T.audio && !T.audio.paused) {
	      T.razors[T.cur_doc] = T.audio.currentTime;
	      render();
    }

    window.requestAnimationFrame(tick);
}

(function() {
    const $uplArea = document.getElementById("upload-area");

    $uplArea.ondragover = function(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "copy";
        ev.currentTarget.children[0].textContent = "RELEASE FILE TO UPLOAD";
    },
    $uplArea.ondragleave = function(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.currentTarget.children[0].textContent = "UPLOAD FILE";
    },
    $uplArea.ondrop = function(ev) {
        ev.stopPropagation();
        ev.preventDefault();

        console.log("drop");
        ev.currentTarget.children[0].textContent = "UPLOAD FILE";

        got_files(ev.dataTransfer.files);
    },
    $uplArea.onclick = function() {
        document.getElementById("upload-button").click()
    }

    document.getElementById("upload-button").onchange = function(ev) {
        got_files(ev.target.files);
    };

    // zip these, but append csvs
    ['mat', 'align', 'pitch'].forEach(name => {
        document.getElementById('dl-all-' + name).onclick = () => {
            Promise.all(get_docs().filter(doc => doc[name]).map(doc => {
                return fetch('/media/' + doc[name]).then(response => response.blob()).then(blob => ({ docid: doc.id, blob: blob }));
            })).then(blobdocs => {
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
        Promise.all(get_docs().filter(doc => doc.csv).map(doc => {
            return fetch('/media/' + doc.csv).then(response => response.text()).then(textContent => ({ docid: doc.id, textContent: textContent }));
        })).then(blobdocs => {
            let cocatenated = '';
            blobdocs.forEach(({ docid, textContent }) => {
                let doc = T.docs[docid];
                let numCommas = textContent.substring(0, textContent.indexOf('\n')).split(',').length - 1;
                cocatenated += `${doc.title}`;
                for (let i = 0; i < numCommas; i++) cocatenated += ',';
                cocatenated += '\n';
                cocatenated += textContent;
            })

            saveAs(new Blob([cocatenated]), 'main.csv');
        })
    }

    document.getElementById('delete-all-audio').onclick = () => get_docs().forEach(delete_action);
})()

if(!T.ticking) {
    T.ticking = true;
    tick();
}

render();
