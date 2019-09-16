const Wrappers = document.querySelector('#Wrappers')

// Menu elements
const Menu = Wrappers.querySelector('#MenuWrap > .menu')
Menu.Items = Menu.querySelectorAll('.menu__item')
for (let item of Menu.Items) {
  item.Label = item.querySelector('.item-label')
  item.Link = item.querySelector('.item-label__link')
  item.Expand = item.querySelector('.item-label__expand')
  if (item.querySelector('.submenu')) {
    item.Submenu = item.querySelector('.submenu')
    item.Submenu.Items = item.Submenu.querySelectorAll('.subitem')
    item.Submenu.Items.forEach((subitem) => {
      subitem.Link = subitem.querySelector('.subitem__link')
    })
  }
}

const MainWrap = Wrappers.querySelector('#MainWrap')
MainWrap.viewBox = MainWrap.querySelector('.viewBox')
MainWrap.Sections = MainWrap.querySelector('.main_section')
MainWrap.Sections.Scrollbar = MainWrap.Sections.querySelector('.scrollbar')
MainWrap.Sections.Scrollbar.Slider = MainWrap.Sections.Scrollbar.querySelector('.scrollbar__slider')

export default {
  Wrappers,
  Menu,
  MainWrap
}
