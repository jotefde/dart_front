import { DOM } from '../libs'

let mainscrollActive = false
let mainscrollHold = 0
let mainScrollbar = DOM.MainWrap.Sections.Scrollbar
let mainScrollbarSlider = DOM.MainWrap.Sections.Scrollbar.Slider
let viewBox = DOM.MainWrap.viewBox
mainScrollbarSlider.addEventListener('mousedown', (ev) => {
  mainscrollHold = ev.clientY - 90
  mainscrollActive = true
  ev.preventDefault()
})
DOM.Wrappers.addEventListener('mouseup', (ev) => {
  mainscrollActive = false
  ev.preventDefault()
})
function viewBoxScroll (ev) {
  let evt = window.event || ev
  let delta = evt.detail ? evt.detail * (-120) : evt.wheelDelta
  delta /= 5
  let maxViewProp = -(viewBox.offsetHeight - DOM.MainWrap.Sections.offsetHeight) / viewBox.offsetHeight
  let trackHeight = mainScrollbar.offsetHeight
  let newProp = (viewBox.offsetTop + delta) / viewBox.offsetHeight
  newProp = (newProp > 0) ? 0.00 : (newProp < maxViewProp) ? maxViewProp : newProp
  viewBox.style.marginTop = 'calc(100% * ' + newProp + ')'
  mainScrollbarSlider.style.marginTop = -trackHeight * newProp + 'px'
}

let mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? 'DOMMouseScroll' : 'mousewheel'
DOM.MainWrap.Sections.addEventListener(mousewheelevt, viewBoxScroll, false)

DOM.Wrappers.addEventListener('mousemove', (ev) => {
  let viewProp = DOM.MainWrap.Sections.offsetHeight / viewBox.offsetHeight
  let trackHeight = mainScrollbar.offsetHeight
  mainScrollbarSlider.style.height = viewProp * trackHeight + 'px'

  if (mainscrollActive) {
    let sliderOffset = mainScrollbarSlider.offsetTop
    let newPos = ev.clientY - 90
    let sliderHeight = mainScrollbarSlider.offsetHeight
    let holdOffset = Math.abs(newPos - sliderOffset)
    let offsetProp = 0.00
    let maxViewProp = -(viewBox.offsetHeight - DOM.MainWrap.Sections.offsetHeight) / viewBox.offsetHeight
    if (newPos == mainscrollHold) return false
    if (newPos < mainscrollHold && newPos - holdOffset <= 0) {
      offsetProp = 0.00
      mainScrollbarSlider.style.marginTop = '0px'
    } else if (newPos > mainscrollHold && newPos - holdOffset + sliderHeight > trackHeight) {
      offsetProp = maxViewProp
      mainScrollbarSlider.style.marginTop = trackHeight - sliderHeight + 'px'
    } else {
      offsetProp = -(sliderOffset + (newPos - mainscrollHold)) / trackHeight
      mainScrollbarSlider.style.marginTop = sliderOffset + (newPos - mainscrollHold) + 'px'
    }
    if (offsetProp < maxViewProp) offsetProp = maxViewProp
    viewBox.style.marginTop = 'calc(100% * ' + offsetProp + ')'
    mainscrollHold = newPos
  }
  ev.preventDefault()
})
