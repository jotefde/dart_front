import { DOM } from '../libs'

export class Listeners {
  constructor (_parent) {
    this.parentItem = _parent
    this.list = []
    this.groups = []
  }

  AddListener (_item) {
    this.list.push(
      new ItemListener(_item, this)
    )
  }

  AddGroup (_groupItem) {
    this.list.push(
      new GroupListener(_groupItem, this)
    )
    this.groups.push(
      new Listeners(_groupItem)
    )
    return this.Groups('last')
  }

  List (_getby = undefined) {
    let result = false
    if (_getby === undefined) {
      result = this.list
    } else if (_getby instanceof HTMLElement) {
      result = this.list.find(obj => obj.item === _getby)
    } else if (_getby === 'last') {
      result = this.list[this.list.length - 1]
    } else if (_getby === 'first') {
      result = this.list[0]
    }
    return result
  }

  Groups (_getby = undefined) {
    let result = false
    if (_getby === undefined) {
      result = this.groups
    } else if (_getby === 'last') {
      result = this.groups[this.groups.length - 1]
    } else if (_getby === 'first') {
      result = this.groups[0]
    }
    return result
  }
}

export class ItemListener {
  constructor (_item, _parentGroup) {
    this.item = _item
    this.parentGroup = _parentGroup
    this.item.addEventListener('click', this.eventHandler.bind(this))
  }

  eventHandler (ev) {
    ev.preventDefault()
    this.flushVisistedFlag()
    if (!this.isSubitem()) {
      this.itemEvent()
    } else {
      this.subitemEvent()
    }
  }

  itemEvent () {
    this.item.classList.toggle('menu__item--visited')
  }

  subitemEvent () {
    this.parentGroup.parentItem.classList.add('menu__item--visited')
    this.item.classList.toggle('subitem--visited')
  }

  flushVisistedFlag () {
    let elements = DOM.Menu.querySelectorAll('.menu__item--visited, .subitem--visited')
    for (let el of elements) {
      el.classList.remove('subitem--visited', 'menu__item--visited')
    }
  }

  isSubitem () {
    return this.item.classList.contains('subitem')
  }
}

export class GroupListener {
  constructor (_groupItem, _parentGroup) {
    this.groupItem = _groupItem
    this.parentGroup = _parentGroup
    this.groupItem.addEventListener('click', this.eventHandler.bind(this))
  }

  eventHandler (ev) {
    ev.preventDefault()
    if (!this.isSubAction(ev.target)) {
      this.groupItem.classList.toggle('menu__item--expanded')
      this.groupItem.querySelector('.item-label__expand').textContent = 'expand_more'
      if (this.groupItem.classList.contains('menu__item--expanded')) {
        this.flushVisistedFlag()
        this.groupItem.classList.add('menu__item--visited')
        this.groupItem.querySelector('.item-label__expand').textContent = 'expand_less'
      }
    }
  }

  flushVisistedFlag () {
    let elements = DOM.Menu.querySelectorAll('.menu__item--visited, .subitem--visited')
    for (let el of elements) {
      el.classList.remove('subitem--visited', 'menu__item--visited')
    }
  }

  isSubAction (_el) {
    let classes = '.' + _el.getAttribute('class').replace(' ', ' .')
    let submenu = this.groupItem.Submenu
    if (!submenu) {
      return false
    } else if (submenu.querySelector(classes) || _el === submenu) {
      return true
    }
    return false
  }
}
