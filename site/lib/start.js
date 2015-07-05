import headtrackr from 'lib/headtrackr'
import call from 'lib/call'

export default function () {
  var videoInput = document.getElementById('inputVideo')
  var canvasInput = document.getElementById('inputCanvas')
  var ctx = canvasInput.getContext('2d')
  var canvasOutput = document.getElementById('outputCanvas')
  var crop = canvasOutput.getContext('2d')

  var htracker = new headtrackr.Tracker()

  htracker.init(videoInput, canvasInput)
  htracker.start()

  var whitenessFromColour = function (colour) {
    var c, m, y, k
    var r, g, b

    r = colour.r / 255.0
    g = colour.g / 255.0
    b = colour.b / 255.0

    k = Math.min(1 - r, 1 - g, 1 - b)

    c = (1 - r - k) / (1 - k)
    m = (1 - g - k) / (1 - k)
    y = (1 - b - k) / (1 - k)

    c = Math.round(c * 100.0)
    m = Math.round(m * 100.0)
    y = Math.round(y * 100.0)
    k = Math.round(k * 100.0)

    console.log('cmyk:' + [c, m, y, k].join(', '))

    var dark = y + m > 90 || c > 10
    var darkness
    if (dark) {
      darkness = 'Too dark'
    } else {
      darkness = 'Not too dark!'
    }

    var yellow = Math.abs(y - m) > 20
    var yellowness
    if (yellow) {
      yellowness = 'Too yellow'
    } else {
      yellowness = 'Not too yellow!'
    }

    document.getElementById('dark').innerHTML = darkness
    document.getElementById('yellow').innerHTML = yellowness

    return (!dark) && (!yellow)

  }

  var medianColourFromFace = function (event) {
    var Htrim = event.width * 0.4
    var Vtrim = event.height * 0.5
    var cropX = event.x - event.width * 0.5 + Htrim * 0.5
    var cropW = event.width - Htrim
    var cropY = event.y - event.height * 0.5 + Vtrim * 0.3
    var cropH = event.height - Vtrim

    crop.drawImage(canvasInput,
      cropX, cropY, cropW, cropH,
      0, 0, cropW, cropH)
    crop.width = cropW
    crop.height = cropH

    var imageData = crop.getImageData(0, 0, cropW, cropH)
    var data = imageData.data
    var ra = []
    var ga = []
    var ba = []

    for (var i = 0, l = data.length; i < l; i += 4) {
      ra.push(data[i])
      ga.push(data[i + 1])
      ba.push(data[i + 2])
    }

    function median (values) {
      values.sort(function (a, b) {return a - b})
      var half = Math.floor(values.length / 2)
      if (values.length % 2) {
        return values[half]
      } else {
        return (values[half - 1] + values[half]) / 2.0
      }
    }
    var r = median(ra)
    var g = median(ga)
    var b = median(ba)

    var maxc = Math.max(r, g, b)
    var boost = 255 - maxc
    console.log('boost:' + boost)
    console.log('rgb:' + [r, g, b].join(', '))

    r = Math.floor(r + boost * r / maxc)
    g = Math.floor(g + boost * g / maxc)
    b = Math.floor(b + boost * b / maxc)

    ctx.fillStyle = 'rgb(' + [r, g, b].join(',') + ')'
    ctx.fillRect(0, 0, 80, 80)

    console.log('rgb:' + [r, g, b].join(', '))

    return {r: r, g: g, b: b}
  }

  var samples = 1
  var tries = 10
  var matches = 0
  var running = true
  document.addEventListener('facetrackingEvent', function (event) {
    if (running && event.width > 80 && event.height > 80) {
      var white = document.getElementById('white')
      var colour = medianColourFromFace(event)
      var isWhite = whitenessFromColour(colour)
      if (isWhite) {
        matches = matches + 1
      }
      samples = samples + 1
      console.log(matches)
      if (samples > tries) {
        if (matches > samples * 0.8) {
          white.innerHTML = 'Congratulations! You are white!'
        } else {
          white.innerHTML = 'Sorry, you are not white!'
        }
        running = false
        call(htracker.getStream(), samples > tries)
      // htracker.stop()
      }
    }
  })
}
