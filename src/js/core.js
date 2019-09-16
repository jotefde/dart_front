'use strict'
// Import libraries
import { DOM, Navigator } from './libs'

// Import modules
import * as Menu from './modules/menu.js'
require('./modules/scrollbars.js')

function Start () {
  const MenuListeners = new Menu.Listeners(DOM.Menu)
  for (let item of DOM.Menu.Items) {
    if (item.Submenu) {
      let submenu = MenuListeners.AddGroup(item)
      for (let subitem of item.Submenu.Items) {
        submenu.AddListener(subitem)
      }
    } else {
      MenuListeners.AddListener(item)
    }
  }
  console.dir(MenuListeners)
  Navigator.LoadContent('http://darciarz.pl')
    .then(console.log)
  console.log(Navigator.URL())
}

Navigator.Init()
Navigator.LoadAccess()
  .then(token => {
    Navigator.token = Navigator.token || token
    Start()
  })
