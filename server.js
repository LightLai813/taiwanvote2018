const editJsonFile = require("edit-json-file");
const csv=require('csvtojson');

function paddingLeft(str,lenght){
    if(str.length >= lenght) return str;
    else return paddingLeft("0" +str,lenght);
}

// 設定人口
csv()
.fromFile(`${__dirname}/js/originData/population.csv`)
.then(jsonObj=>{
    let townName = '';
    const townInfo = {};

    for(let i=1, villageInfo; !!(villageInfo=jsonObj[i]);i++){
        villageInfo.site_id = villageInfo.site_id.replace(/臺/g,'台');
        villageInfo.site_id = villageInfo.site_id.replace(/　/g,'');
        
        if(villageInfo.site_id=='高雄市鳳山一' || villageInfo.site_id=='高雄市鳳山二'){
            villageInfo.site_id = '高雄市鳳山區';
        }

        if(villageInfo.site_id=='高雄市三民一' || villageInfo.site_id=='高雄市三民二'){
            villageInfo.site_id = '高雄市三民區';
        }

        const countyName = villageInfo.site_id.substring(0,3);
        const townSName = villageInfo.site_id.substring(3,villageInfo.site_id.length);

        if(townName !== villageInfo.site_id){
            townName = villageInfo.site_id;

            if(!townInfo[countyName]){
                townInfo[countyName] = {};
            }
            townInfo[countyName][townSName] = {
                lower40: 0,
                upper40: 0
            }
        }

        const town = townInfo[countyName][townSName];
        
        for(let j=0;j<=40;j++){
            const numberPadding =paddingLeft(j,3);
            town.lower40 += parseInt(villageInfo[`people_age_${numberPadding}_m`]);
            town.lower40 += parseInt(villageInfo[`people_age_${numberPadding}_f`]);
        }

        for(let j=41;j<=99;j++){
            const numberPadding =paddingLeft(j,3);
            town.upper40 += parseInt(villageInfo[`people_age_${numberPadding}_m`]);
            town.upper40 += parseInt(villageInfo[`people_age_${numberPadding}_f`]);
        }
    }

    for(let cKey in townInfo){
        for(let tKey in townInfo[cKey]){
            const town = townInfo[cKey][tKey];
            town.lower40Percent =  town.lower40/(town.lower40+ town.upper40);
        }
    }

    // 設定結婚、收入與學歷
    csv()
    .fromFile(`${__dirname}/js/originData/data_zh.csv`)
    .then(jsonObj=>{
        for(let i=0,info;!!(info=jsonObj[i]);i++){
            info.site_id = info.site_id.replace(/臺/g,'台').replace(/　/g,'');
            
            if(info.site_id=='高雄市鳳山一' || info.site_id=='高雄市鳳山二'){
                info.site_id = '高雄市鳳山區';
            }

            if(info.site_id=='高雄市三民一' || info.site_id=='高雄市三民二'){
                info.site_id = '高雄市三民區';
            }

            const countyName = info.site_id.substring(0,3);
            const townSName = info.site_id.substring(3,info.site_id.length);
            const town = townInfo[countyName][townSName];
            
            switch(countyName){
                case '台北市':
                case '新北市':
                case '基隆市':
                case '桃園市':
                case '新竹市':
                case '新竹縣':
                    town.pos = 'N';
                    break;
                case '苗栗縣':
                case '台中市':
                case '彰化縣':
                case '南投縣':
                case '雲林縣':
                    town.pos = 'M';
                    break;
                case '嘉義市':
                case '嘉義縣':
                case '台南市':
                case '高雄市':
                case '屏東縣':
                case '澎湖縣':
                    town.pos = 'S';
                    break;
                case '花蓮縣':
                case '台東縣':
                case '宜蘭縣':
                    town.pos = 'E';
                    break;
                case '金門縣':
                case '連江縣':
                    town.pos = 'O';
                    break;
                
            }

            town.agemiddle = info['年齡中位數'];
            town.agemiddlePercent =(parseFloat(info['年齡中位數'])-30)/25;
            town.collage = info['大學畢業比例(%)'];
            town.income = info['所得中位數(萬元)'];
            town.incomePercent = (parseFloat(info['所得中位數(萬元)'])-40)/70;
            town.married = info['曾經結婚比例(%)'];
        }

        // 設定投票數
        csv()
        .fromFile(`${__dirname}/js/originData/vote.csv`)
        .then(jsonObj=>{
            for(let i=0,info;!!(info=jsonObj[i]);i++){
                if(info['區域'].length>3){
                    info['區域'] = info['區域'].replace(/臺/g,'台').replace(/　/g,'');

                    const countyName = info['區域'].substring(0,3);
                    const townSName = info['區域'].substring(3,info['區域'].length);
                    const town = townInfo[countyName][townSName];
                    const voteId = info['案號'].replace('第','').replace('案','');

                    town[`vote${voteId}`] = {
                        agree: info['同意票數'],
                        disagree: info['不同意票數'],
                        votePercent: parseFloat(info['投票率(%)'].replace('%',''))*.01,
                        agreePercent: parseFloat(info['有效同意票數對投票權人數百分比(%)'].replace('%',''))*.01,
                        realAgreePercent: info['同意票數']/(parseInt(info['同意票數'])+parseInt(info['不同意票數']))
                    }
                }
            }

            const countyFile = editJsonFile(`${__dirname}/js/map/tw-county-topo.json`);
            for(let i=0, county;!!(county = countyFile.data.objects.counties.geometries[i]);i++){

                townInfo[county.properties.name].id = county.id;
            }

            const file = editJsonFile(`${__dirname}/js/townInfo.json`);
            file.data = townInfo;
            // console.log(file);
            file.save()
        })
    })
})

// const file = editJsonFile(`${__dirname}/js/map/tw-town-topo.json`);
// for(let i=0, town;!!(town = file.data.objects.town.geometries[i]);i++){
//     const townName = town.properties.name;
//     town.properties = {
//         county: townName.substring(0,3),
//         town: townName.substring(3,townName.lenght)
//     };
// }
// file.save();
 
// const file = editJsonFile(`${__dirname}/js/map/tw-county-topo.json`);
// for(let i=0, county;!!(county = file.data.objects.counties.geometries[i]);i++){
//     delete county.properties.position;
    
//     switch(county.properties.name){
//         case '台北市':
//         case '新北市':
//         case '基隆市':
//         case '桃園市':
//         case '新竹市':
//         case '新竹縣':
//         case '宜蘭縣':
//             county.properties.pos = 'N';
//             break;
//         case '苗栗縣':
//         case '台中市':
//         case '彰化縣':
//         case '南投縣':
//         case '雲林縣':
//             county.properties.pos = 'M';
//             break;
//         case '嘉義市':
//         case '嘉義縣':
//         case '台南市':
//         case '高雄市':
//         case '屏東縣':
//         case '澎湖縣':
//             county.properties.pos = 'S';
//             break;
//         case '花蓮縣':
//         case '台東縣':
//             county.properties.pos = 'E';
//             break;
//         case '金門縣':
//         case '連江縣':
//             county.properties.pos = 'O';
//             break;

//     }

//     console.log(county.properties.name, county.properties.pos)
// }
// file.save();
 


