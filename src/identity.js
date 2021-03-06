import {MessageDigest} from 'jsrsasign';
import Identicon from 'identicon.js';
import Attribute from './attribute';

/**
* An Identifi identity profile. Usually you don't create them yourself, but get them
* from Index methods such as search().
*/
class Identity {
  constructor(data: Object) {
    this.data = data; // data to (de)serialize
    this.profile = {};
    this.mostVerifiedAttributes = {};
    if (data.attrs.length) { // old index format
      const c = data.attrs[0];
      if (c.pos !== undefined && c.neg !== undefined && c.neut !== undefined) {
        this.data.receivedPositive = c.pos;
        this.data.receivedNegative = c.neg;
        this.data.receivedNeutral = c.neut;
      }
    }
    this.data.receivedNegative |= 0;
    this.data.receivedPositive |= 0;
    this.data.receivedNeutral |= 0;
    this.data.sentNegative |= 0;
    this.data.sentPositive |= 0;
    this.data.sentNeutral |= 0;
    this.data.trustDistance = this.data.hasOwnProperty(`trustDistance`) ? this.data.trustDistance : 99;
    this.data.attrs.forEach(a => {
      if (!this.linkTo && Attribute.isUniqueType(a.name)) {
        this.linkTo = a;
      }
      if (!Number.isNaN(parseInt(a.dist)) && a.dist >= 0 && a.dist < this.data.trustDistance) {
        this.data.trustDistance = parseInt(a.dist);
        if (Attribute.isUniqueType(a.name)) {
          this.linkTo = a;
        }
      }
      switch (a.name) {
      case `email`:
        a.iconStyle = `glyphicon glyphicon-envelope`;
        a.btnStyle = `btn-success`;
        a.link = `mailto:${a.val}`;
        a.quickContact = true;
        break;
      case `bitcoin_address`:
      case `bitcoin`:
        a.iconStyle = `fa fa-bitcoin`;
        a.btnStyle = `btn-primary`;
        a.link = `https://blockchain.info/address/${a.val}`;
        a.quickContact = true;
        break;
      case `gpg_fingerprint`:
      case `gpg_keyid`:
        a.iconStyle = `fa fa-key`;
        a.btnStyle = `btn-default`;
        a.link = `https://pgp.mit.edu/pks/lookup?op=get&search=0x${a.val}`;
        break;
      case `account`:
        a.iconStyle = `fa fa-at`;
        break;
      case `nickname`:
        a.iconStyle = `glyphicon glyphicon-font`;
        break;
      case `name`:
        a.iconStyle = `glyphicon glyphicon-font`;
        break;
      case `tel`:
      case `phone`:
        a.iconStyle = `glyphicon glyphicon-earphone`;
        a.btnStyle = `btn-success`;
        a.link = `tel:${a.val}`;
        a.quickContact = true;
        break;
      case `keyID`:
        a.iconStyle = `fa fa-key`;
        break;
      case `url`:
        a.link = a.val;
        if (a.val.indexOf(`facebook.com/`) > - 1) {
          a.iconStyle = `fa fa-facebook`;
          a.btnStyle = `btn-facebook`;
          a.link = a.val;
          a.linkName = a.val.split(`facebook.com/`)[1];
          a.quickContact = true;
        } else if (a.val.indexOf(`twitter.com/`) > - 1) {
          a.iconStyle = `fa fa-twitter`;
          a.btnStyle = `btn-twitter`;
          a.link = a.val;
          a.linkName = a.val.split(`twitter.com/`)[1];
          a.quickContact = true;
        } else if (a.val.indexOf(`plus.google.com/`) > - 1) {
          a.iconStyle = `fa fa-google-plus`;
          a.btnStyle = `btn-google-plus`;
          a.link = a.val;
          a.linkName = a.val.split(`plus.google.com/`)[1];
          a.quickContact = true;
        } else if (a.val.indexOf(`linkedin.com/`) > - 1) {
          a.iconStyle = `fa fa-linkedin`;
          a.btnStyle = `btn-linkedin`;
          a.link = a.val;
          a.linkName = a.val.split(`linkedin.com/`)[1];
          a.quickContact = true;
        } else if (a.val.indexOf(`github.com/`) > - 1) {
          a.iconStyle = `fa fa-github`;
          a.btnStyle = `btn-github`;
          a.link = a.val;
          a.linkName = a.val.split(`github.com/`)[1];
          a.quickContact = true;
        } else {
          a.iconStyle = `glyphicon glyphicon-link`;
          a.btnStyle = `btn-default`;
        }
      }
      const keyExists = Object.keys(this.mostVerifiedAttributes).indexOf(a.name) > - 1;
      if (a.conf * 2 > a.ref * 3 && (!keyExists || a.conf - a.ref > this.mostVerifiedAttributes[a.name].verificationScore)) {
        this.mostVerifiedAttributes[a.name] = {
          attribute: a,
          verificationScore: a.conf - a.ref
        };
      }
    });
    if (this.linkTo.name !== `keyID` && this.mostVerifiedAttributes.keyID) {
      this.linkTo = this.mostVerifiedAttributes.keyID.attribute;
    }
    Object.keys(this.mostVerifiedAttributes).forEach(k => {
      if ([`name`, `nickname`, `email`, `url`, `coverPhoto`, `profilePhoto`].indexOf(k) > - 1) {
        this.profile[k] = this.mostVerifiedAttributes[k].attribute.val;
      }
    });
  }

  /**
  * @returns {string} stringified JSON from the identity data
  */
  serialize() {
    return JSON.stringify(this.data, `utf8`);
  }

  /**
  * @param {string} str stringified JSON of the identity data
  * @returns {Identity} Identity object from the serialized data
  */
  static deserialize(str) {
    return new Identity(JSON.parse(str));
  }

  /**
  * @param {string} attribute attribute type
  * @returns {string} most verified value of the param type
  */
  verified(attribute: String) {
    return this.mostVerifiedAttributes.hasOwnProperty(attribute) ? this.mostVerifiedAttributes[attribute].attribute.val : undefined;
  }

  /**
  * @returns {HTMLElement} profile card html element describing the identity
  */
  profileCard() {
    const card = document.createElement(`div`);
    card.className = `identifi-card`;

    const identicon = this.identicon(60);
    identicon.style.order = 1;
    identicon.style.flexShrink = 0;
    identicon.style.marginRight = `15px`;

    const details = document.createElement(`div`);
    details.style.padding = `5px`;
    details.style.order = 2;
    details.style.flexGrow = 1;
    const link = `https://identi.fi/#/identities/${this.linkTo.name}/${this.linkTo.val}`;
    details.innerHTML = `<a href="${link}">${this.profile.name || this.profile.nickname || `${this.linkTo.name}:${this.linkTo.val}`}</a><br>`;
    details.innerHTML += `<small>Received: <span class="identifi-pos">+${this.data.receivedPositive || 0}</span> / <span class="identifi-neg">-${this.data.receivedNegative || 0}</span></small><br>`;
    const links = document.createElement(`small`);
    this.data.attrs.forEach(a => {
      if (a.link) {
        links.innerHTML += `${a.name}: <a href="${a.link}">${a.val}</a> `;
      }
    });
    details.appendChild(links);

    card.appendChild(identicon);
    card.appendChild(details);
    /*
    const template = ```
    <tr ng-repeat="result in ids.list" id="result{$index}" ng-hide="!result.linkTo" ui-sref="identities.show({ type: result.linkTo.type, value: result.linkTo.value })" class="search-result-row" ng-class="{active: result.active}">
      <td class="gravatar-col"><identicon id="result" border="3" width="46" positive-score="result.pos" negative-score="result.neg"></identicon></td>
      <td>
        <span ng-if="result.distance == 0" class="label label-default pull-right">viewpoint</span>
        <span ng-if="result.distance > 0" ng-bind="result.distance | ordinal" class="label label-default pull-right"></span>
        <a ng-bind-html="result.name|highlight:query.term" ui-sref="identities.show({ type: result.linkTo.type, value: result.linkTo.value })"></a>
        <small ng-if="!result.name" class="list-group-item-text">
          <span ng-bind-html="result[0][0]|highlight:query.term"></span>
        </small><br>
        <small>
          <span ng-if="result.nickname && result.name != result.nickname" ng-bind-html="result.nickname|highlight:query.term" class="mar-right10"></span>
          <span ng-if="result.email" class="mar-right10">
            <span class="glyphicon glyphicon-envelope"></span> <span ng-bind-html="result.email|highlight:query.term"></span>
          </span>
          <span ng-if="result.facebook" class="mar-right10">
            <span class="fa fa-facebook"></span> <span ng-bind-html="result.facebook|highlight:query.term"></span>
          </span>
          <span ng-if="result.twitter" class="mar-right10">
            <span class="fa fa-twitter"></span> <span ng-bind-html="result.twitter|highlight:query.term"></span>
          </span>
          <span ng-if="result.googlePlus" class="mar-right10">
            <span class="fa fa-google-plus"></span> <span ng-bind-html="result.googlePlus|highlight:query.term"></span>
          </span>
          <span ng-if="result.bitcoin" class="mar-right10">
            <span class="fa fa-bitcoin"></span> <span ng-bind-html="result.bitcoin|highlight:query.term"></span>
          </span>
        </small>
      </td>
    </tr>
    ```;*/
    return card;
  }

  /**
  * Appends a search widget to the given HTMLElement
  * @param {HTMLElement} parentElement element where the search widget is added and event listener attached
  * @param {Index} index index root to use for search
  */
  static appendSearchWidget(parentElement, index) {
    const form = document.createElement(`form`);

    const input = document.createElement(`input`);
    input.type = `text`;
    input.placeholder = `Search`;
    input.id = `identifiSearchInput`;
    form.innerHTML += `<div id="identifiSearchResults"></div>`;

    const searchResults = document.createElement(`div`);

    parentElement.appendChild(form);
    form.appendChild(input);
    form.appendChild(searchResults);
    input.addEventListener(`keyup`, async () => {
      const r = await index.search(input.value);
      searchResults.innerHTML = ``;
      r.sort((a, b) => {return a.trustDistance - b.trustDistance;});
      r.forEach(i => {
        searchResults.appendChild(i.profileCard());
      });
    });
  }

  static _ordinal(n) {
    const s = [`th`, `st`, `nd`, `rd`];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  static _injectCss() {
    const elementId = `identifiStyle`;
    if (document.getElementById(elementId)) {
      return;
    }
    const sheet = document.createElement(`style`);
    sheet.id = elementId;
    sheet.innerHTML = `
      .identifi-identicon * {
        box-sizing: border-box;
      }

      .identifi-identicon {
        vertical-align: middle;
        margin: auto;
        border-radius: 50%;
        text-align: center;
        display: inline-block;
        position: relative;
        margin: auto;
        max-width: 100%;
      }

      .identifi-distance {
        z-index: 2;
        position: absolute;
        left:0%;
        top:2px;
        width: 100%;
        text-align: right;
        color: #fff;
        text-shadow: 0 0 1px #000;
        font-size: 75%;
        line-height: 75%;
        font-weight: bold;
      }

      .identifi-pie {
        border-radius: 50%;
        position: absolute;
        top: 0;
        left: 0;
        box-shadow: 0px 0px 0px 0px #82FF84;
        padding-bottom: 100%;
        max-width: 100%;
        -webkit-transition: all 0.2s ease-in-out;
        -moz-transition: all 0.2s ease-in-out;
        transition: all 0.2s ease-in-out;
      }

      .identifi-card {
        padding: 10px;
        background-color: #f7f7f7;
        color: #777;
        border: 1px solid #ddd;
        display: flex;
        flex-direction: row;
        overflow: hidden;
      }

      .identifi-card a {
        -webkit-transition: color 150ms;
        transition: color 150ms;
        text-decoration: none;
        color: #337ab7;
      }

      .identifi-card a:hover, .identifi-card a:active {
        text-decoration: underline;
        color: #23527c;
      }

      .identifi-pos {
        color: #3c763d;
      }

      .identifi-neg {
        color: #a94442;
      }

      .identifi-identicon img {
        position: absolute;
        top: 0;
        left: 0;
        max-width: 100%;
        border-radius: 50%;
        border-color: transparent;
        border-style: solid;
      }`;
    document.body.appendChild(sheet);
  }

  /**
  * @param {number} width of the identicon
  * @param {number} border identicon border (aura) width
  * @param {boolean} showDistance whether to show web of trust distance ordinal
  * @returns {HTMLElement} identicon element that can be appended to DOM
  */
  identicon(width, border = 4, showDistance = true) {
    Identity._injectCss(); // some other way that is not called on each identicon generation?
    const identicon = document.createElement(`div`);
    identicon.className = `identifi-identicon`;
    identicon.style.width = `${width}px`;
    identicon.style.height = `${width}px`;

    // Define colors etc
    let bgColor = `rgba(0,0,0,0.2)`;
    let bgImage = `none`;
    let transform = ``;
    let boxShadow = `0px 0px 0px 0px #82FF84`;
    if (this.data.receivedPositive > this.data.receivedNegative * 20) {
      boxShadow = `0px 0px ${border * this.data.receivedPositive / 50}px 0px #82FF84`;
    } else if (this.data.receivedPositive < this.data.receivedNegative * 3) {
      boxShadow = `0px 0px ${border * this.data.receivedNegative / 10}px 0px #BF0400`;
    }
    if (this.data.receivedPositive + this.data.receivedNegative > 0) {
      if (this.data.receivedPositive > this.data.receivedNegative) {
        transform = `rotate(${((- this.data.receivedPositive / (this.data.receivedPositive + this.data.receivedNegative) * 360 - 180) / 2)}deg)`;
        bgColor = `#A94442`;
        bgImage = `linear-gradient(${this.data.receivedPositive / (this.data.receivedPositive + this.data.receivedNegative) * 360}deg, transparent 50%, #3C763D 50%), linear-gradient(0deg, #3C763D 50%, transparent 50%)`;
      } else {
        transform = `rotate(${((- this.data.receivedNegative / (this.data.receivedPositive + this.data.receivedNegative) * 360 - 180) / 2) + 180}deg)`;
        bgColor = `#3C763D`;
        bgImage = `linear-gradient(${this.data.receivedNegative / (this.data.receivedPositive + this.data.receivedNegative) * 360}deg, transparent 50%, #A94442 50%), linear-gradient(0deg, #A94442 50%, transparent 50%)`;
      }
    }

    const pie = document.createElement(`div`);
    pie.className = `identifi-pie`;
    pie.style.backgroundColor = bgColor;
    pie.style.backgroundImage = bgImage;
    pie.style.width = `${width}px`;
    pie.style.boxShadow = boxShadow;
    pie.style.opacity = (this.data.receivedPositive + this.data.receivedNegative) / 10 * 0.5 + 0.35;
    pie.style.transform = transform;

    const hash = new MessageDigest({alg: `md5`, prov: `cryptojs`}).digestString(JSON.stringify(this.linkTo));
    const identiconImg = new Identicon(hash, {width, format: `svg`});

    const img = document.createElement(`img`);
    img.src = `data:image/svg+xml;base64,${identiconImg.toString()}`;
    img.alt = ``;
    img.width = width;
    img.style.borderWidth = `${border}px`;

    if (showDistance) {
      const distance = document.createElement(`span`);
      distance.textContent = this.data.trustDistance < 1000 ? Identity._ordinal(this.data.trustDistance) : `–`;
      distance.className = `identifi-distance`;
      distance.style.fontSize = width > 50 ? `${width / 4}px` : `10px`;
      identicon.appendChild(distance);
    }

    identicon.appendChild(pie);
    identicon.appendChild(img);

    return identicon;
  }
}

export default Identity;
