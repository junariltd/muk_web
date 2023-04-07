/** @odoo-module **/

/**********************************************************************************
*
*    Copyright (c) 2017-today MuK IT GmbH.
*
*    This file is part of MuK REST for Odoo
*    (see https://mukit.at).
*
*    MuK Proprietary License v1.0
*
*    This software and associated files (the "Software") may only be used
*    (executed, modified, executed after modifications) if you have
*    purchased a valid license from MuK IT GmbH.
*
*    The above permissions are granted for a single database per purchased
*    license. Furthermore, with a valid license it is permitted to use the
*    software on other databases as long as the usage is limited to a testing
*    or development environment.
*
*    You may develop modules based on the Software or that use the Software
*    as a library (typically by depending on it, importing it and using its
*    resources), but without copying any source code or material from the
*    Software. You may distribute those modules under the license of your
*    choice, provided that this license is compatible with the terms of the
*    MuK Proprietary License (For example: LGPL, MIT, or proprietary licenses
*    similar to this one).
*
*    It is forbidden to publish, distribute, sublicense, or sell copies of
*    the Software or modified copies of the Software.
*
*    The above copyright notice and this permission notice must be included
*    in all copies or substantial portions of the Software.
*
*    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
*    OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
*    THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
*    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
*    DEALINGS IN THE SOFTWARE.
*
**********************************************************************************/

import { registry } from '@web/core/registry';
import { useService } from "@web/core/utils/hooks";

import { Component } from "@odoo/owl";
import { ActionContainer } from '@web/webclient/actions/action_container'
import { WebsitePreview } from '@website/client_actions/website_preview/website_preview'
import { patch } from "@web/core/utils/patch";
import { xml, EventBus, useState } from "@odoo/owl";

// Create an Odoo service for communication between components
export const AppBarService = {
    dependencies: [],
    start(env) {
        const bus = new EventBus();
        function registerEventHandler(event, fnct) {
            bus.addEventListener(event, fnct);
        }
        function triggerEvent(event) {
            bus.trigger(event);
        }
        return {
            registerEventHandler: registerEventHandler.bind(this),
            triggerEvent: triggerEvent.bind(this),
        };
    },
};
registry.category('services').add('muk_appbar', AppBarService);


// Define AppBar visual component, which listens to the 'expand_bar' and 'collapse_bar' events
// of the AppBarService

export class AppsBar extends Component {
    setup() {
        this.state = useState({
            expanded: false,
            is_hidden: false
        })
        this.appbar_svc = useService("muk_appbar");
        this.appbar_svc.registerEventHandler('expand_bar', () => this._expandAppbar());
        this.appbar_svc.registerEventHandler('collapse_bar', () => this._collapseAppbar());
        this.appbar_svc.registerEventHandler('hide_bar', () => this._hideAppbar());
        this.appbar_svc.registerEventHandler('show_bar', () => this._showAppbar());
    }
    onMouseMove(ev) {
        let current_position = ev.clientX
        if(current_position > 0 && current_position <= 20) {
            this._expandAppbar();
        }
    }
    _collapseAppbar() {
        if (this.state.expanded) {
            this.state.expanded = false;
        }
    }
    _expandAppbar() {
        if (!this.state.expanded) {
            this.state.expanded = true;
        }
    }
    _hideAppbar() {
        if (!this.state.is_hidden) {
            this.state.is_hidden = true;
        }
    }
    _showAppbar() {
        if (this.state.is_hidden) {
            this.state.is_hidden = false;
        }
    }
}
Object.assign(AppsBar, {
    template: 'muk_web_theme.AppsBar',
    props: {
    	apps: Array,
    },
});


/* Override Odoo's "ActionContainer" component:
 *  - When the user moves the mouse over the main action window, trigger the navbar to collapse
 *  - When the navbar is shown or hidden, adjust the action manager left padding accordinly
*/
patch(ActionContainer.prototype, 'muk_web_theme.ActionContainer', {
    setup() {
        const res = this._super(...arguments);
        this.appbar_state = useState({
            remove_appbar_padding: false
        })
        this.appbar_svc = useService("muk_appbar");
        this.appbar_svc.registerEventHandler('hide_bar', () => this._removeAppbarPadding());
        this.appbar_svc.registerEventHandler('show_bar', () => this._addAppbarPadding());
        this.onNewAction = this.onNewAction.bind(this);
        this.env.bus.addEventListener("ACTION_MANAGER:UPDATE", this.onNewAction);
        return res;
    },
    _removeAppbarPadding() {
        this.appbar_state.remove_appbar_padding = true;
    },
    _addAppbarPadding() {
        this.appbar_state.remove_appbar_padding = false;
    },
    onMainWindowMouseMove() {
        this.appbar_svc.triggerEvent('collapse_bar');
    },
    onNewAction() {
        let component = this.info.Component;
        if (component && component.Component) {
            component = component.Component;
        }
        if (component == WebsitePreview) {
            this.appbar_svc.triggerEvent('hide_bar');
        }
        else {
            setTimeout(() => { // delay slightly so it doesn't load before the main view
                this.appbar_svc.triggerEvent('show_bar');
            }, 300);
        }
    }
});
ActionContainer.template = xml`
    <t t-name="web.ActionContainer">
      <div class="o_action_manager" t-on-mousemove="onMainWindowMouseMove"
        t-att-style="appbar_state.remove_appbar_padding ? 'padding-left: 0px;' : ''">
        <t t-if="info.Component" t-component="info.Component" className="'o_action'" t-props="info.componentProps" t-key="info.id"/>
      </div>
    </t>`;
