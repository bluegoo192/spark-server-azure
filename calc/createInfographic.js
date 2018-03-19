const InfogramAPI = require('infogram');

const infogram = new InfogramAPI('BmEcrrBDPufSFTdM03zbJZ7yLqbJAxBo', 'yjsol4SiCf9r5cET5a2uNZyTiQjDErsw');

module.exports = async function (address) {
  var params = {
    theme_id: 294,
    content: [
      {
        "type": "h1",
        "text": "4131 El Camino Real"
      },
      {
        "type": "body",
        "text": "Lorem ipsum dolor sit amet..."
      },
      {
        "type": "quote",
        "text": "God does not play dice",
        "author": "Albert Einstein"
      },
      {
        "type": "chart",
        "chart_type": "bar",
        "data": [
          [
            ["apples", "today", "yesterday", "d. bef. yesterday"],
            ["John", 4, 6, 7],
            ["Peter", 1, 3, 9],
            ["George", 4, 4, 3]
          ]
        ],
        "settings": {
          "width": 0.5,
          "height": 300
        }
      },
      {
        "type": "map",
        "territory": "world",
        "data": [
          {
            "title": "Japan",
            "value": 126434964,
            "label": "Japan",
            "group": "A",
            "color": "#0000FF"
          },
          {
            "title": "United States",
            "value": 318968000,
            "label": "USA",
            "group": "A",
            "color": "#FF0000"
          }
        ]
      }
    ]
  }
  // let infographic = await infogram.createProject(params);
  // console.log(infographic);
  if (address.pictures.length > 0)
    return address.pictures[0];
  else
    return null;
}
