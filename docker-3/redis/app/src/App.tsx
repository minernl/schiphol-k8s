import React, { JSX, useEffect, useState } from 'react';
import axios from 'axios';

import './spectre-hch.scss';

function App() {
  const [src, setSrc] = useState(undefined as Source | undefined);
  const [filter, setFilter] = useState('');

  // load initial links
  useEffect(() => {
    async function onload() {
      const res = await axios.get('api/links');
      setSrc(res.data as Source);
    }
    void onload();
  }, []);

  if (!src) return undefined;

  // "hidden" yaml source upload functionality
  let uploadNode;
  if (window.location.pathname === '/upload') {
    // import new links
    const uploadYaml = (event: React.ChangeEvent<HTMLInputElement>):void => {
      const reader = new FileReader();
      reader.onload = (async (e) => {
        const yaml = String(e.target?.result);
        const headers = { 'Content-Type': 'text/plain' };
        const res = await axios.post('/api/yaml', yaml, { headers });
        setSrc(res.data as Source);
      });
      const { files } = event.target;
      if (files) reader.readAsText(files[0]);
      // eslint-disable-next-line no-param-reassign
      event.target.value = '';
    };
    uploadNode = (
      <section className="navbar-section form-input">
        <label className="p-centered text-primary" htmlFor="upload">
          Upload links...
          <input
            id="upload"
            onChange={uploadYaml}
            style={{
              left: 0, opacity: 0, position: 'absolute', width: '100%',
            }}
            type="file"
          />
        </label>
      </section>
    );
  }

  // build the sections and individual links
  const columns: JSX.Element[] = [];
  for (let col = 1, index = 0; col <= 3; col++) {
    const colCards: JSX.Element[] = [];
    while (index < src.sections.length && index < Math.ceil(col * (src.sections.length / 3))) {
      const section = src.sections[index];
      const cardLinks = section.links
        .filter((link) => (!filter || link.name.includes(filter)))
        .map((link) => (<li key={link.name}><a href={link.href} rel="noopener noreferrer" target="_blank">{link.name}</a></li>));
      colCards.push(
        <div className="card card-3d" key={index}>
          <div className="card-header">
            <div className="card-title h5">{section.name}</div>
          </div>
          <div className="card-body">
            <ul>
              {cardLinks}
            </ul>
          </div>
        </div>,
      );
      index += 1;
    }
    columns.push(<div className="column col-4 col-lg-6 col-sm-12 p-0" key={col}>{colCards}</div>);
  }

  return (
    <div className="container">
      <header className="navbar pt-1">
        <section className="navbar-section">
          <img src="favicon.png" height={27} width={27} alt="" />
          <div className="navbar-brand pl-2">{src.name}</div>
        </section>
        {uploadNode}
        <section className="navbar-section">
          <div className="input-group input-inline">
            <input className="form-input" type="text" placeholder="Bevat" onChange={(event) => { setFilter(event.target.value); }} />
          </div>
        </section>
      </header>
      <div className="columns">
        {columns}
      </div>
    </div>
  );
}

export default App;
