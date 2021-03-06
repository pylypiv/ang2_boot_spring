function CertificateAdjuster()
{
}

CertificateAdjuster.prototype.extract = function(from, what)
{
    certName = "";

    var begin = from.indexOf(what);

    if(begin>=0)
    {
        var end = from.indexOf(', ', begin);
        certName = (end<0) ? from.substr(begin) : from.substr(begin, end - begin);
    }

    return certName;
}

CertificateAdjuster.prototype.Print2Digit = function(digit)
{
    return (digit<10) ? "0"+digit : digit;
}

CertificateAdjuster.prototype.GetCertDate = function(paramDate)
{
    var certDate = new Date(paramDate);
    return this.Print2Digit(certDate.getUTCDate())+"."+this.Print2Digit(certDate.getMonth()+1)+"."+certDate.getFullYear() + " " +
             this.Print2Digit(certDate.getUTCHours()) + ":" + this.Print2Digit(certDate.getUTCMinutes()) + ":" + this.Print2Digit(certDate.getUTCSeconds());
}

CertificateAdjuster.prototype.GetCertName = function(certSubjectName)
{
    return this.extract(certSubjectName, 'CN=');
}

CertificateAdjuster.prototype.GetIssuer = function(certIssuerName)
{
    return this.extract(certIssuerName, 'CN=');
}

CertificateAdjuster.prototype.GetCertInfoString = function(certSubjectName, certFromDate)
{
    return this.extract(certSubjectName,'CN=') + "; Выдан: " + this.GetCertDate(certFromDate);
}

function CheckForPlugIn_Async() {
    function VersionCompare_Async(StringVersion, ObjectVersion)
    {
        if(typeof(ObjectVersion) == "string")
            return -1;
        var arr = StringVersion.split('.');
        var isActualVersion = true;

        cadesplugin.async_spawn(function *() {
            if((yield ObjectVersion.MajorVersion) == parseInt(arr[0]))
            {
                if((yield ObjectVersion.MinorVersion) == parseInt(arr[1]))
                {
                    if((yield ObjectVersion.BuildVersion) == parseInt(arr[2]))
                    {
                        isActualVersion = true;
                    }
                    else if((yield ObjectVersion.BuildVersion) < parseInt(arr[2]))
                    {
                        isActualVersion = false;
                    }
                }else if((yield ObjectVersion.MinorVersion) < parseInt(arr[1]))
                {
                    isActualVersion = false;
                }
            }else if((yield ObjectVersion.MajorVersion) < parseInt(arr[0]))
            {
                isActualVersion = false;
            }

            if(!isActualVersion)
            {
                document.getElementById('PluginEnabledImg').setAttribute("src", "app/crypto_pro/sources/yellow_dot.png");
                document.getElementById('PlugInEnabledTxt').innerHTML = "Плагин загружен, но есть более свежая версия.";
            }
            document.getElementById('PlugInVersionTxt').innerHTML = "Версия плагина: " + (yield CurrentPluginVersion.toString());
            var oAbout = yield cadesplugin.CreateObjectAsync("CAdESCOM.About");
            var ver = yield oAbout.CSPVersion("", 75);
            var ret = (yield ver.MajorVersion) + "." + (yield ver.MinorVersion) + "." + (yield ver.BuildVersion);
            document.getElementById('CSPVersionTxt').innerHTML = "Версия криптопровайдера: " + ret;

            try
            {
                var sCSPName = yield oAbout.CSPName(75);
                document.getElementById('CSPNameTxt').innerHTML = "Криптопровайдер: " + sCSPName;
            }
            catch(err){}
            return;
        });
    }

    function GetLatestVersion_Async(CurrentPluginVersion) {
        var xmlhttp = getXmlHttp();
        xmlhttp.open("GET", "app/crypto_pro/sources/latest_2_0.txt", true);
        xmlhttp.onreadystatechange = function() {
        var PluginBaseVersion;
            if (xmlhttp.readyState == 4) {
                if(xmlhttp.status == 200) {
                    PluginBaseVersion = xmlhttp.responseText;
                    VersionCompare_Async(PluginBaseVersion, CurrentPluginVersion)
                }
            }
        }
        xmlhttp.send(null);
    }

    document.getElementById('PluginEnabledImg').setAttribute("src", "app/crypto_pro/sources/green_dot.png");
    document.getElementById('PlugInEnabledTxt').innerHTML = "Плагин загружен.";
    var CurrentPluginVersion;
    cadesplugin.async_spawn(function *() {
        var oAbout = yield cadesplugin.CreateObjectAsync("CAdESCOM.About");
        CurrentPluginVersion = yield oAbout.PluginVersion;
        GetLatestVersion_Async(CurrentPluginVersion);
        if(location.pathname.indexOf("symalgo_sample.html")>=0){
            FillCertList_Async('CertListBox1');
            FillCertList_Async('CertListBox2');
        }else {
            FillCertList_Async('CertListBox');
        }
        // var txtDataToSign = "Hello World";
        // document.getElementById("DataToSignTxtBox").innerHTML = txtDataToSign;
        // document.getElementById("SignatureTxtBox").innerHTML = "";
    }); //cadesplugin.async_spawn
}

function FillCertList_Async(lstId) {
    cadesplugin.async_spawn(function *() {
        var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
        if (!oStore) {
            alert("store failed");
            return;
        }

        try {
            yield oStore.Open();
        }
        catch (ex) {
            alert("Ошибка при открытии хранилища: " + cadesplugin.getLastError(ex));
            return;
        }

        var lst = document.getElementById(lstId);
        if(!lst)
        {
            return;
        }
        var certCnt;
        var certs;

        try {
            certs = yield oStore.Certificates;
            certCnt = yield certs.Count;
        }
        catch (ex) {
            var errormes = document.getElementById("boxdiv").style.display = '';
            return;
        }

        if(certCnt == 0)
        {
            var errormes = document.getElementById("boxdiv").style.display = '';
            return;
        }

        for (var i = 1; i <= certCnt; i++) {
            var cert;
            try {
                cert = yield certs.Item(i);
            }
            catch (ex) {
                alert("Ошибка при перечислении сертификатов: " + cadesplugin.getLastError(ex));
                return;
            }

            var oOpt = document.createElement("OPTION");
            var dateObj = new Date();
            try {
                var ValidToDate = new Date((yield cert.ValidToDate));
                var ValidFromDate = new Date((yield cert.ValidFromDate));
                var Validator = yield cert.IsValid();
                var IsValid = yield Validator.Result;
                if(dateObj< ValidToDate && (yield cert.HasPrivateKey()) && IsValid) {
                    oOpt.text = new CertificateAdjuster().GetCertInfoString(yield cert.SubjectName, ValidFromDate);
                }
                else {
                    continue;
                }
            }
            catch (ex) {
                alert("Ошибка при получении свойства SubjectName: " + cadesplugin.getLastError(ex));
            }
            try {
                oOpt.value = yield cert.Thumbprint;
            }
            catch (ex) {
                alert("Ошибка при получении свойства Thumbprint: " + cadesplugin.getLastError(ex));
            }

            lst.options.add(oOpt);
        }

        yield oStore.Close();
    });//cadesplugin.async_spawn
}

function CreateSimpleSign_Async() {
    cadesplugin.async_spawn(function*(arg) {
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            yield oStore.Open();
        } catch (err) {
            alert('Failed to create CAdESCOM.Store: ' + err.number);
            return;
        }
        var all_certs = yield oStore.Certificates;

        if ((yield all_certs.Count) == 0) {
            var errormes = document.getElementById("boxdiv").style.display = '';
            return;
        }

        var cert;
        var found = 0;
        for (var i = 1; i <= (yield all_certs.Count); i++) {
            try {
                cert = yield all_certs.Item(i);
            }
            catch (ex) {
                alert("Ошибка при перечислении сертификатов: " + cadesplugin.getLastError(ex));
                return;
            }

            var dateObj = new Date();
            try {
                var certDate = new Date((yield cert.ValidToDate));
                var Validator = yield cert.IsValid();
                var IsValid = yield Validator.Result;
                if(dateObj< certDate && (yield cert.HasPrivateKey()) && IsValid) {
                    found = 1;
                    break;
                }
                else {
                    continue;
                }
            }
            catch (ex) {
                alert("Ошибка при получении свойства SubjectName: " + cadesplugin.getLastError(ex));
            }
        }

        if (found == 0) {
            var errormes = document.getElementById("boxdiv").style.display = '';
            return;
        }

        var dataToSign = document.getElementById("DataToSignTxtBox").value;
        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            FillCertInfo_Async(cert);
            var errormes = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            if (oSigner) {
                yield oSigner.propset_Certificate(cert);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }

            var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
            var CADES_BES = 1;

            if (dataToSign) {
                // Данные на подпись ввели
                yield oSignedData.propset_Content(dataToSign);
                yield oSigner.propset_Options(1); //CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN
                try {
                    Signature = yield oSignedData.SignCades(oSigner, CADES_BES);
                }
                catch (err) {
                    errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                    throw errormes;
                }
            }
            document.getElementById("SignatureTxtBox").innerHTML = Signature;
            SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
        }
        catch(err)
        {
            SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
            document.getElementById("SignatureTxtBox").innerHTML = err;
        }
    }); //cadesplugin.async_spawn
}


function SignCadesBES_Async(certListBoxId, data, setDisplayData) {
    cadesplugin.async_spawn(function*(arg) {
        var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var thumbprint = e.options[selectedCertID].value.split(" ").reverse().join("").replace(/\s/g, "").toUpperCase();
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            yield oStore.Open();
        } catch (err) {
            alert('Failed to create CAdESCOM.Store: ' + err.number);
            return;
        }

        var all_certs = yield oStore.Certificates;
        var oCerts = yield all_certs.Find(cadesplugin.CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);

        if ((yield oCerts.Count) == 0) {
            alert("Certificate not found");
            return;
        }
        var certificate = yield oCerts.Item(1);

        var dataToSign = document.getElementById("DataToSignTxtBox").value;
        if(typeof(data) != 'undefined')
        {
            dataToSign = Base64.encode(data);
        }else {
	    dataToSign = Base64.encode(dataToSign);
	}
        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            FillCertInfo_Async(certificate);
            var errormes = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            var oSigningTimeAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");

            yield oSigningTimeAttr.propset_Name(cadesplugin.CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME);
            var oTimeNow = new Date();
            yield oSigningTimeAttr.propset_Value(oTimeNow);
            var attr = yield oSigner.AuthenticatedAttributes2;
            yield attr.Add(oSigningTimeAttr);


            var oDocumentNameAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
            yield oDocumentNameAttr.propset_Name(cadesplugin.CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME);
            yield oDocumentNameAttr.propset_Value("Document Name");
            yield attr.Add(oDocumentNameAttr);

            if (oSigner) {
                yield oSigner.propset_Certificate(certificate);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }

            var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
            if (dataToSign) {
                // Данные на подпись ввели
                yield oSigner.propset_Options(cadesplugin.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN);
                yield oSignedData.propset_ContentEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY); //
                if(typeof(setDisplayData) != 'undefined')
                {
                    //Set display data flag flag for devices like Rutoken PinPad
                    yield oSignedData.propset_DisplayData(1);
                }
                yield oSignedData.propset_Content(dataToSign);

                try {
                    Signature = yield oSignedData.SignCades(oSigner, cadesplugin.CADESCOM_CADES_BES);
                }
                catch (err) {
                    errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                    throw errormes;
                }
            }
            document.getElementById("SignatureTxtBox").innerHTML = Signature;
            SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
        }
        catch(err)
        {
            SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
            document.getElementById("SignatureTxtBox").innerHTML = err;
        }
    }, certListBoxId); //cadesplugin.async_spawn
}

function ConvertDate(date) {
    switch (navigator.appName) {
        case "Microsoft Internet Explorer":
            return date.getVarDate();
        default:
            return date;
    }
}
/*
 * Метод делает раздельную подпись
 */
function SignCadesBES_Async_File_razdelnya(certListBoxId) {
    cadesplugin.async_spawn(function*(arg) {
        var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var thumbprint = e.options[selectedCertID].value.split(" ").reverse().join("").replace(/\s/g, "").toUpperCase();
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            yield oStore.Open();
        } catch (err) {
            alert('Failed to create CAdESCOM.Store: ' + err.number);
            return;
        }

        var CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0;
        var all_certs = yield oStore.Certificates;
        var oCerts = yield all_certs.Find(CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);

        if ((yield oCerts.Count) == 0) {
            alert("Certificate not found");
            return;
        }
        var certificate = yield oCerts.Item(1);


        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            FillCertInfo_Async(certificate);
            var errormes = "";
            var oSigner ;
            try {
                oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            
            /*var oSigningTimeAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
            yield oSigningTimeAttr.Name = 0//CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME;
            var oTimeNow = new Date();
            yield oSigningTimeAttr.Value = ConvertDate(oTimeNow);

            var oDocumentNameAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
            yield oDocumentNameAttr.Name = 1//CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME;
            yield oDocumentNameAttr.Value = "Document Name";
            yield oSigner.AuthenticatedAttributes2.Add(oSigningTimeAttr);
            yield oSigner.AuthenticatedAttributes2.Add(oDocumentNameAttr);
*/
            
            
            var oSigningTimeAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");

            yield oSigningTimeAttr.propset_Name(cadesplugin.CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME);
            var oTimeNow = new Date();
            yield oSigningTimeAttr.propset_Value(oTimeNow);
            var attr = yield oSigner.AuthenticatedAttributes2;
            yield attr.Add(oSigningTimeAttr);


            var oDocumentNameAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
            yield oDocumentNameAttr.propset_Name(cadesplugin.CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME);
            yield oDocumentNameAttr.propset_Value("Document Name");
            yield attr.Add(oDocumentNameAttr);
            
            if (oSigner) {
                yield oSigner.propset_Certificate(certificate);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }

            var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
            var CADESCOM_CADES_BES = 1;
            var dataToSign = fileContent; // fileContent - объявлен в Code.js
            //var dataToSign = Base64.encode(fileContent);
            
            if (dataToSign) {
                // Данные на подпись ввели
                yield oSignedData.propset_ContentEncoding(1); //CADESCOM_BASE64_TO_BINARY
                yield oSignedData.propset_Content(dataToSign);
                yield oSigner.propset_Options(1); //CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN
                try {
                    var StartTime = Date.now();
                    Signature = yield oSignedData.SignCades(oSigner, CADESCOM_CADES_BES,true);
                    var EndTime = Date.now();
                    document.getElementsByName('TimeTitle')[0].innerHTML = "Время выполнения: " + (EndTime - StartTime) + " мс";
                }
                catch (err) {
                    errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                    throw errormes;
                }
            }
            document.getElementById("SignatureTxtBox").innerHTML = Signature;
            SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
            
            //addFile_cadesSov_server('/uploadFile3',Signature,fileName,fileContent);
            let pathfile = yield addFile_cadesSov_server('/uploadFile3',Signature,fileName,fileContent);
            let a = document.getElementById('href_signed_razdFILE');
            a.text=pathfile.substring(pathfile.indexOf('\\')+2,pathfile.indexOf('","'));
            a.href = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '')+'/'+pathfile.substring(pathfile.indexOf('"["')+3,pathfile.indexOf('","'));
            document.getElementById('div_href_signed_razdFILE').style.display = 'block';
            
            let b = document.getElementById('href_signed_razdPOD');
            let temp =pathfile.substring(pathfile.indexOf('","')+3);
            b.text=temp.substring(temp.indexOf('\\')+2,temp.indexOf('"]'));
            b.href = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '')+'/'+temp.substring(0,temp.indexOf('"]'));
            document.getElementById('div_href_signed_razdPOD').style.display = 'block';
            
        }
        catch(err)
        {
            SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
            document.getElementById("SignatureTxtBox").innerHTML = err;
        }
    }, certListBoxId); //cadesplugin.async_spawn
    }


function SignCadesBES_Async_File_veref_razdelnya(){
	var CADESCOM_CADES_BES = 1;
	cadesplugin.async_spawn(function*(arg) {
	
	var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
	 // Предварительно закодированные в BASE64 бинарные данные
     // В данном случае закодирован вложенный файл
	//	 	var dataToVerify = fileContent;
	let path_file = document.getElementById("href_signed_razdFILE").href;
	dataToVerify = yield readbinary('GET',path_file);
	//alert(dataToVerify) 
	 
	 // подписанное сообщение
	let path_ecp = document.getElementById("href_signed_razdPOD").href;
	var sSignedMessage = yield readStringFromFileAtPath('GET',path_ecp);
	 //var sSignedMessage = document.getElementById("SignatureTxtBox").value;
	 var oSigner;
	 var oSignerN;
     try {
         // Значение свойства ContentEncoding должно быть задано
         // до заполнения свойства Content
    	 yield oSignedData.propset_ContentEncoding(1); //CADESCOM_BASE64_TO_BINARY
         yield oSignedData.propset_Content(dataToVerify);
         yield oSignedData.VerifyCades(sSignedMessage, CADESCOM_CADES_BES, true);
         oSigner = yield oSignedData.Signers;
         var count = yield oSigner.Count;
         let begin,end,SigningTime,serinfvalid,IsValid;
         let par = document.getElementById('PRPCB_date');
         par.innerHTML=''
         while(count > 0){
        	 oSignerN = yield oSigner.Item(count);
        	 var cert = yield oSignerN.Certificate;
             var owner = yield cert.SubjectName;
             begin = yield owner.indexOf('CN=');
             end = yield owner.indexOf(', ', begin);
             
             serinfvalid = yield cert.IsValid();
             IsValid = yield serinfvalid.Result;
             
             SigningTime = new Date(yield oSignerN.SigningTime);
             
             owner = yield owner.substr(begin, end - begin);
             
             
             let child = document.createElement('div');
             par.appendChild(child);
             child.innerHTML = 'Дата подписи: '+SigningTime+' Владелец:  '+owner+' Действительна: '+IsValid;
             
        	 count--;
         }
     } catch (err) {
         alert("Failed to verify signature. Error: " + cadesplugin.getLastError(err));
         return false;
     }

     
     return true;
     
	});
	
	
}

/*
 * Проверка совмещенной подписи
 */

function SignCadesBES_Async_File_veref(){
	var CADESCOM_CADES_BES = 1;
	cadesplugin.async_spawn(function*(arg) {
	
	var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
	 
	 // подписанное сообщение из textarea
	 //var sSignedMessage = document.getElementById("SignatureTxtBox").value;
	let path = document.getElementById("href_signed_sov").href;
	
	var sSignedMessage = yield readStringFromFileAtPath('GET',path);
		
	 var oSigner;
	 var oSignerN;
	 var oSignerContent;
	 var tyty;
     try {
         yield oSignedData.VerifyCades(sSignedMessage, CADESCOM_CADES_BES);
         oSigner = yield oSignedData.Signers;
         var count = yield oSigner.Count;
         let begin,end,SigningTime,serinfvalid,IsValid;
         let par = document.getElementById('PSPCB_date');
         par.innerHTML='';
         while(count > 0){
        	 oSignerN = yield oSigner.Item(count);
        	 var cert = yield oSignerN.Certificate;
             var owner = yield cert.SubjectName;
             begin = yield owner.indexOf('CN=');
             end = yield owner.indexOf(', ', begin);
             
             serinfvalid = yield cert.IsValid();
             IsValid = yield serinfvalid.Result;
             
             SigningTime = new Date(yield oSignerN.SigningTime);
             
             owner = yield owner.substr(begin, end - begin);
             
             let child = document.createElement('div');
             par.appendChild(child);
             child.innerHTML = 'Дата подписи: '+SigningTime+' Владелец:  '+owner+' Действительна: '+IsValid;
             
        	 count--;
         }
        // oSignerN = yield oSigner.Item(1);
     } catch (err) {
         alert("Failed to verify signature. Error: " + cadesplugin.getLastError(err));
         return false;
     }
     
     
     
     /*alert(yield cert.SerialNumber);
     alert(yield cert.Thumbprint);
     alert(yield cert.ValidFromDate);
     alert(yield cert.ValidToDate);
     alert(yield cert.Version);
     alert(yield cert.IssueName);*/
     
     
     return true;
	});
}

/*
 * Параллелная совмещенная подпись 
 */
function Sign_parallelSovm(certListBoxId){
	var CADESCOM_CADES_BES = 1;
	cadesplugin.async_spawn(function*(arg) {
		
		var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var thumbprint = e.options[selectedCertID].value.split(" ").reverse().join("").replace(/\s/g, "").toUpperCase();
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            yield oStore.Open();
        } catch (err) {
            alert('Failed to create CAdESCOM.Store: ' + err.number);
            return;
        }

        var CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0;
        var all_certs = yield oStore.Certificates;
        var oCerts = yield all_certs.Find(CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);

        if ((yield oCerts.Count) == 0) {
            alert("Certificate not found");
            return;
        }
        var certificate = yield oCerts.Item(1);


        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            FillCertInfo_Async(certificate);
            var errormes = "",oSigner;
            try {
                oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            
            
            if (oSigner) {
                yield oSigner.propset_Certificate(certificate);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }
		
		
	
	var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
	 
	 // подписанное сообщение из "выбрать файл"
	var sSignedMessage = Base64.decode(fileContent);
		
	 var oSigner,sSignedMessage1,oSignerN,oSignerContent,tyty;
     
         yield oSignedData.VerifyCades(sSignedMessage, CADESCOM_CADES_BES);
         sSignedMessage1 = yield  oSignedData.CoSignCades(oSigner, CADESCOM_CADES_BES,0);
         /*oSigner = yield oSignedData.Signers;
         var count = oSigner.Count;
         oSignerN = yield oSigner.Item(1);*/
         //oSignerContent = yield oSignedData.Content;
     } catch (err) {
         alert("Failed to verify signature. Error: " + err);
         return false;
     }

     document.getElementById("SignatureTxtBox").innerHTML = sSignedMessage1;
     SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
     
     var pathfile = yield addFile_cadesSov_server('/uploadFile3',sSignedMessage1,fileName,null);
     var a = document.getElementById('href_signed_sov');
     a.text=pathfile.substring(pathfile.indexOf('\\')+1);
     a.href = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '')+'/'+pathfile;
     document.getElementById('div_href_signed_sov').style.display = 'block';
     
     alert('OK');
     return true;
	}, certListBoxId);
}


/*
 * Параллелная раздельная подпись 
 */
function Sign_parallelRaz(certListBoxId){
	var CADESCOM_CADES_BES = 1;
	cadesplugin.async_spawn(function*(arg) {
		
		var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var thumbprint = e.options[selectedCertID].value.split(" ").reverse().join("").replace(/\s/g, "").toUpperCase();
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            yield oStore.Open();
        } catch (err) {
            alert('Failed to create CAdESCOM.Store: ' + err.number);
            return;
        }

        var CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0;
        var all_certs = yield oStore.Certificates;
        var oCerts = yield all_certs.Find(CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);

        if ((yield oCerts.Count) == 0) {
            alert("Certificate not found");
            return;
        }
        var certificate = yield oCerts.Item(1);


        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            FillCertInfo_Async(certificate);
            var errormes = "",oSigner;
            try {
                oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            
            
            if (oSigner) {
                yield oSigner.propset_Certificate(certificate);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }
		
            var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");

	       	let path_file = document.getElementById("href_signed_razdFILE").href;
	       	dataToVerify = yield readbinary('GET',path_file);
       	 
	       	let path_ecp = document.getElementById("href_signed_razdPOD").href;
	       	var sSignedMessage = yield readStringFromFileAtPath('GET',path_ecp);
           	yield oSignedData.propset_ContentEncoding(1); //CADESCOM_BASE64_TO_BINARY
           yield oSignedData.propset_Content(dataToVerify);
            
           var oSigner,sSignedMessage1,oSignerN,oSignerContent,tyty;
           yield oSignedData.VerifyCades(sSignedMessage, CADESCOM_CADES_BES, true);
           sSignedMessage1 = yield  oSignedData.CoSignCades(oSigner, CADESCOM_CADES_BES,0);
         /*oSigner = yield oSignedData.Signers;
         var count = oSigner.Count;
         oSignerN = yield oSigner.Item(1);*/
         //oSignerContent = yield oSignedData.Content;
     } catch (err) {
         alert("Failed to verify signature. Error: " + err.message);
         return false;
     }

     document.getElementById("SignatureTxtBox").innerHTML = sSignedMessage1;
     SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
     
     var pathfile = yield addFile_cadesSov_server('/uploadFile3',sSignedMessage1,fileName,null);
     var a = document.getElementById('href_signed_razdPOD');
     a.text=pathfile.substring(pathfile.indexOf('\\')+1);
     a.href = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '')+'/'+pathfile;
     
     
     alert('OK');
     return true;
	}, certListBoxId);
}


/*
 * Проверка совмещенной подписи с извлечением файла
 */
function SignCadesBES_Async_File_veref_getfile(){
	var CADESCOM_CADES_BES = 1;
	cadesplugin.async_spawn(function*(arg) {
	
	var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
	 
	 // подписанное сообщение из textarea
	 //var sSignedMessage = document.getElementById("SignatureTxtBox").value;
	let path = document.getElementById("href_signed_sov").href;
	// с сервера получаем строку(совмещенного подписанного файла) в Base64
	var sSignedMessage = yield readStringFromFileAtPath('GET',path);
	 var promise,oSigner,oSignerN;
	 var datafromBase64;
	 var test;
     try {
         yield oSignedData.VerifyCades(sSignedMessage, CADESCOM_CADES_BES);
         yield oSignedData.propset_ContentEncoding(1);
         oSigner = yield oSignedData.Signers;
         //oSignerN = yield oSigner.Item(1);
         var count = yield oSigner.Count;
         let begin,end,SigningTime,serinfvalid,IsValid;
         let par = document.getElementById('PSPCB_date');
         par.innerHTML=''
         while(count > 0){
        	 oSignerN = yield oSigner.Item(count);
        	 var cert = yield oSignerN.Certificate;
             var owner = yield cert.SubjectName;
             begin = yield owner.indexOf('CN=');
             end = yield owner.indexOf(', ', begin);
             
             serinfvalid = yield cert.IsValid();
             IsValid = yield serinfvalid.Result;
             
             SigningTime = new Date(yield oSignerN.SigningTime);
             
             owner = yield owner.substr(begin, end - begin);
             
             
             let child = document.createElement('div');
             par.appendChild(child);
             child.innerHTML = 'Дата подписи: '+SigningTime+' Владелец:  '+owner+' Действительна: '+IsValid;
             
        	 count--;
         }
         
         
         fromBase64 = yield oSignedData.Content;
         var byteCharacters = atob(fromBase64);
         var byteNumbers = new Array(byteCharacters.length);
         for (var i = 0; i < byteCharacters.length; i++) {
             byteNumbers[i] = byteCharacters.charCodeAt(i);
         }
         var byteArray = new Uint8Array(byteNumbers);
         var blob1 = new Blob([byteArray], {type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"});

         var fileName1 = document.getElementById("href_signed_sov").text;
         fileName1 = fileName1.replace('.p7s','');
         
         saveAs(blob1, fileName1);
         
     } catch (err) {
         alert("Failed to verify signature. Error: " + cadesplugin.getLastError(err));
         return false;
     }
     
	});
}

/*
 * Совмещенная подпись(не параллельная) 
 */
function SignCadesBES_Async_File(certListBoxId) {
    cadesplugin.async_spawn(function*(arg) {
        var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var thumbprint = e.options[selectedCertID].value.split(" ").reverse().join("").replace(/\s/g, "").toUpperCase();
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            yield oStore.Open();
        } catch (err) {
            alert('Failed to create CAdESCOM.Store: ' + err.number);
            return;
        }

        var CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0;
        var all_certs = yield oStore.Certificates;
        var oCerts = yield all_certs.Find(CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);

        if ((yield oCerts.Count) == 0) {
            alert("Certificate not found");
            return;
        }
        var certificate = yield oCerts.Item(1);


        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            FillCertInfo_Async(certificate);
            var errormes = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
                        
            var oSigningTimeAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");

            yield oSigningTimeAttr.propset_Name(cadesplugin.CAPICOM_AUTHENTICATED_ATTRIBUTE_SIGNING_TIME);
            var oTimeNow = new Date();
            yield oSigningTimeAttr.propset_Value(oTimeNow);
            var attr = yield oSigner.AuthenticatedAttributes2;
            yield attr.Add(oSigningTimeAttr);


            var oDocumentNameAttr = yield cadesplugin.CreateObjectAsync("CADESCOM.CPAttribute");
            yield oDocumentNameAttr.propset_Name(cadesplugin.CADESCOM_AUTHENTICATED_ATTRIBUTE_DOCUMENT_NAME);
            yield oDocumentNameAttr.propset_Value("Test document name");
            yield attr.Add(oDocumentNameAttr);

            if (oSigner) {
                yield oSigner.propset_Certificate(certificate);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }

            var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
            var CADES_BES = 1;

            var dataToSign = fileContent; // fileContent - объявлен в Code.js
            //var dataToSign = Base64.encode(fileContent); 
            if (dataToSign) {
                // Данные на подпись ввели
                yield oSignedData.propset_ContentEncoding(1); //CADESCOM_BASE64_TO_BINARY
                yield oSignedData.propset_Content(dataToSign);
                yield oSigner.propset_Options(1); //CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN
                try {
                    var StartTime = Date.now();
                    Signature = yield oSignedData.SignCades(oSigner, CADES_BES);
                    var EndTime = Date.now();
                    document.getElementsByName('TimeTitle')[0].innerHTML = "Время выполнения: " + (EndTime - StartTime) + " мс";
                }
                catch (err) {
                    errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                    throw errormes;
                }
            }
            
            document.getElementById("SignatureTxtBox").innerHTML = Signature;
            SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
            
            var pathfile = yield addFile_cadesSov_server('/uploadFile3',Signature,fileName,null);
            var a = document.getElementById('href_signed_sov');
            a.text=pathfile.substring(pathfile.indexOf('\\')+1);
            a.href = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '')+'/'+pathfile;
            document.getElementById('div_href_signed_sov').style.display = 'block';
        }
        catch(err)
        {
            SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
            document.getElementById("SignatureTxtBox").innerHTML = err;
        }
    }, certListBoxId); //cadesplugin.async_spawn
    }
/*
 * Метод отправляет на сервер подписанный файл(совмещенная подпись) в формате Base64(строка)
 * В ответ получает ссылку на сервере где лежит эта строка запакованная в namefile.p7s
 * sinnature	-	строка в Base64
 * name	-	имя будующего файла с расширением .p7s
 */
function addFile_cadesSov_server(url,sinnature,name,fileInBase64){
	return new Promise(function (resolve, reject) {
	var body = {cades_bes_sov: sinnature, namefile: name, fileInBase64: fileInBase64};
	var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
	      if (this.status >= 200 && this.status < 300) {
	        resolve(xhr.response);
	      } else {
	        reject({
	          status: this.status,
	          statusText: xhr.statusText
	        });
	      }
	    };
	    xhr.onerror = function () {
	      reject({
	        status: this.status,
	        statusText: xhr.statusText
	      });
	    };
    xhr.send(JSON.stringify(body));

	});
};


function SignCadesXLong_Async(certListBoxId) {
    cadesplugin.async_spawn(function*(arg) {
        var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var thumbprint = e.options[selectedCertID].value.split(" ").reverse().join("").replace(/\s/g, "").toUpperCase();
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            yield oStore.Open();
        } catch (err) {
            alert('Failed to create CAdESCOM.Store: ' + err.number);
            return;
        }

        var CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0;
        var all_certs = yield oStore.Certificates;
        var oCerts = yield all_certs.Find(CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);

        if ((yield oCerts.Count) == 0) {
            alert("Certificate not found");
            return;
        }
        var certificate = yield oCerts.Item(1);

        var dataToSign = document.getElementById("DataToSignTxtBox").value;
        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            FillCertInfo_Async(certificate);
            var errormes = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            if (oSigner) {
                yield oSigner.propset_Certificate(certificate);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }

            var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
            var CADESCOM_CADES_X_LONG_TYPE_1 = 0x5d;
            var tspService = document.getElementById("TSPServiceTxtBox").value ;

            if (dataToSign) {
                // Данные на подпись ввели
                yield oSignedData.propset_Content(dataToSign);
                yield oSigner.propset_Options(1); //CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN
                yield oSigner.propset_TSAAddress(tspService);
                try {
                    Signature = yield oSignedData.SignCades(oSigner, CADESCOM_CADES_X_LONG_TYPE_1);
                }
                catch (err) {
                    errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                    throw errormes;
                }
            }
            document.getElementById("SignatureTxtBox").innerHTML = Signature;
            SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
        }
        catch(err)
        {
            SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
            document.getElementById("SignatureTxtBox").innerHTML = err;
        }
    }, certListBoxId); //cadesplugin.async_spawn
}

function SignCadesXML_Async(certListBoxId) {
    cadesplugin.async_spawn(function*(arg) {
        var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var thumbprint = e.options[selectedCertID].value.split(" ").reverse().join("").replace(/\s/g, "").toUpperCase();
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            yield oStore.Open();
        } catch (err) {
            alert('Failed to create CAdESCOM.Store: ' + err.number);
            return;
        }

        var CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0;
        var all_certs = yield oStore.Certificates;
        var oCerts = yield all_certs.Find(CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);

        if ((yield oCerts.Count) == 0) {
            alert("Certificate not found");
            return;
        }
        var certificate = yield oCerts.Item(1);

        var dataToSign = document.getElementById("DataToSignTxtBox").value;
        var SignatureFieldTitle = document.getElementsByName("SignatureTitle");
        var Signature;
        try
        {
            FillCertInfo_Async(certificate);
            var errormes = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
            } catch (err) {
                errormes = "Failed to create CAdESCOM.CPSigner: " + err.number;
                throw errormes;
            }
            if (oSigner) {
                yield oSigner.propset_Certificate(certificate);
            }
            else {
                errormes = "Failed to create CAdESCOM.CPSigner";
                throw errormes;
            }

            var oSignedXML = yield cadesplugin.CreateObjectAsync("CAdESCOM.SignedXML");

            var signMethod = "";
            var digestMethod = "";

            var pubKey = yield certificate.PublicKey();
            var algo = yield pubKey.Algorithm;
            var algoOid = yield algo.Value;
            if (algoOid == "1.2.643.7.1.1.1.1") {   // алгоритм подписи ГОСТ Р 34.10-2012 с ключом 256 бит
                signMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102012-gostr34112012-256";
                digestMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34112012-256";
            }
            else if (algoOid == "1.2.643.7.1.1.1.2") {   // алгоритм подписи ГОСТ Р 34.10-2012 с ключом 512 бит
                signMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102012-gostr34112012-512";
                digestMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34112012-512";
            }
            else if (algoOid == "1.2.643.2.2.19") {  // алгоритм ГОСТ Р 34.10-2001
                signMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102001-gostr3411";
                digestMethod = "urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr3411";
            }
            else {
                errormes = "Данная демо страница поддерживает XML подпись сертификатами с алгоритмом ГОСТ Р 34.10-2012, ГОСТ Р 34.10-2001";
                throw errormes;
            }
            
            var CADESCOM_XML_SIGNATURE_TYPE_ENVELOPED = 0;

            if (dataToSign) {
                // Данные на подпись ввели
                yield oSignedXML.propset_Content(dataToSign);
                yield oSignedXML.propset_SignatureType(CADESCOM_XML_SIGNATURE_TYPE_ENVELOPED);
                yield oSignedXML.propset_SignatureMethod(signMethod);
                yield oSignedXML.propset_DigestMethod(digestMethod);

                try {
                    Signature = yield oSignedXML.Sign(oSigner);
                }
                catch (err) {
                    errormes = "Не удалось создать подпись из-за ошибки: " + cadesplugin.getLastError(err);
                    throw errormes;
                }
            }
            document.getElementById("SignatureTxtBox").innerHTML = Signature;
            SignatureFieldTitle[0].innerHTML = "Подпись сформирована успешно:";
        }
        catch(err)
        {
            SignatureFieldTitle[0].innerHTML = "Возникла ошибка:";
            document.getElementById("SignatureTxtBox").innerHTML = err;
        }
    }, certListBoxId); //cadesplugin.async_spawn
}

function FillCertInfo_Async(certificate, certBoxId)
{
    var BoxId;
    var field_prefix;
    if(typeof(certBoxId) == 'undefined')
    {
        BoxId = 'cert_info';
        field_prefix = '';
    }else {
        BoxId = certBoxId;
        field_prefix = certBoxId;
    }
    cadesplugin.async_spawn (function*(args) {
        var Adjust = new CertificateAdjuster();
        document.getElementById(args[1]).style.display = '';
        document.getElementById(args[2] + "subject").innerHTML = "Владелец: <b>" + Adjust.GetCertName(yield args[0].SubjectName) + "<b>";
        document.getElementById(args[2] + "issuer").innerHTML = "Издатель: <b>" + Adjust.GetIssuer(yield args[0].IssuerName) + "<b>";
        document.getElementById(args[2] + "from").innerHTML = "Выдан: <b>" + Adjust.GetCertDate(yield args[0].ValidFromDate); + "<b>";
        document.getElementById(args[2] + "till").innerHTML = "Действителен до: <b>" + Adjust.GetCertDate(yield args[0].ValidToDate) + "<b>";
        var pubKey = yield args[0].PublicKey();
        var algo = yield pubKey.Algorithm;
        var fAlgoName = yield algo.FriendlyName;
        document.getElementById(args[2] + "algorithm").innerHTML = "Алгоритм ключа: <b>" + fAlgoName + "<b>";
        var oPrivateKey = yield args[0].PrivateKey;
        var sProviderName = yield oPrivateKey.ProviderName;
        document.getElementById(args[2] + "provname").innerHTML = "Криптопровайдер: <b>" + sProviderName + "<b>";
    }, certificate, BoxId, field_prefix);//cadesplugin.async_spawn
}

function Encrypt_Async() {
    cadesplugin.async_spawn (function*() {
        document.getElementById("DataEncryptedIV1").innerHTML = "";
        document.getElementById("DataEncryptedIV2").innerHTML = "";
        document.getElementById("DataEncryptedDiversData1").innerHTML = "";
        document.getElementById("DataEncryptedDiversData2").innerHTML = "";
        document.getElementById("DataEncryptedBox1").innerHTML = "";
        document.getElementById("DataEncryptedBox2").innerHTML = "";
        document.getElementById("DataEncryptedKey1").innerHTML = "";
        document.getElementById("DataEncryptedKey2").innerHTML = "";
        document.getElementById("DataDecryptedBox1").innerHTML = "";
        document.getElementById("DataDecryptedBox2").innerHTML = "";

        //Get First certificate
        var e = document.getElementById('CertListBox1');
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var thumbprint = e.options[selectedCertID].value.split(" ").reverse().join("").replace(/\s/g, "").toUpperCase();
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            yield oStore.Open();
        } catch (err) {
            alert('Failed to create CAdESCOM.Store: ' + err.number);
            return;
        }

        var CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0;
        var all_certs = yield oStore.Certificates;
        var oCerts = yield all_certs.Find(CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);

        if ((yield oCerts.Count) == 0) {
            alert("Certificate not found");
            return;
        }
        var certificate1 = yield oCerts.Item(1);

        //Get second Certificate
        var e = document.getElementById('CertListBox2');
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var thumbprint = e.options[selectedCertID].value.split(" ").reverse().join("").replace(/\s/g, "").toUpperCase();
        var oCerts = yield all_certs.Find(CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);

        if ((yield oCerts.Count) == 0) {
            alert("Certificate not found");
            return;
        }
        var certificate2 = yield oCerts.Item(1);

        var dataToEncr1 = Base64.encode(document.getElementById("DataToEncrTxtBox1").value);
        var dataToEncr2 = Base64.encode(document.getElementById("DataToEncrTxtBox2").value);

        try
        {
            FillCertInfo_Async(certificate1, 'cert_info1');
            FillCertInfo_Async(certificate2, 'cert_info2');
            var errormes = "";

            try {
                var oSymAlgo = yield cadesplugin.CreateObjectAsync("cadescom.symmetricalgorithm");
            } catch (err) {
                errormes = "Failed to create cadescom.symmetricalgorithm: " + err;
                alert(errormes);
                throw errormes;
            }

            yield oSymAlgo.GenerateKey();

            var oSesKey1 = yield oSymAlgo.DiversifyKey();
            var oSesKey1DiversData = yield oSesKey1.DiversData;
            var oSesKey1IV = yield oSesKey1.IV;
            var EncryptedData1 = yield oSesKey1.Encrypt(dataToEncr1, 1);
            document.getElementById("DataEncryptedDiversData1").innerHTML = oSesKey1DiversData;
            document.getElementById("DataEncryptedIV1").innerHTML = oSesKey1IV;
            document.getElementById("DataEncryptedBox1").innerHTML = EncryptedData1;

            var oSesKey2 = yield oSymAlgo.DiversifyKey();
            var oSesKey2DiversData = yield oSesKey2.DiversData;
            var oSesKey2IV = yield oSesKey2.IV;
            var EncryptedData2 = yield oSesKey2.Encrypt(dataToEncr2, 1);
            document.getElementById("DataEncryptedDiversData2").innerHTML = oSesKey2DiversData;
            document.getElementById("DataEncryptedIV2").innerHTML = oSesKey2IV;
            document.getElementById("DataEncryptedBox2").innerHTML = EncryptedData2;

            var ExportedKey1 = yield oSymAlgo.ExportKey(certificate1);
            document.getElementById("DataEncryptedKey1").innerHTML = ExportedKey1;

            var ExportedKey2 = yield oSymAlgo.ExportKey(certificate2);
            document.getElementById("DataEncryptedKey2").innerHTML = ExportedKey2;

            alert("Данные зашифрованы успешно:");
        }
        catch(err)
        {
            alert("Ошибка при шифровании данных:" + err);
            throw("Ошибка при шифровании данных:" + err);
        }
    });//cadesplugin.async_spawn
}

function Decrypt_Async(certListBoxId) {
    cadesplugin.async_spawn (function*(arg) {
        document.getElementById("DataDecryptedBox1").innerHTML = "";
        document.getElementById("DataDecryptedBox2").innerHTML = "";

        var e = document.getElementById(arg[0]);
        var selectedCertID = e.selectedIndex;
        if (selectedCertID == -1) {
            alert("Select certificate");
            return;
        }

        var thumbprint = e.options[selectedCertID].value.split(" ").reverse().join("").replace(/\s/g, "").toUpperCase();
        try {
            var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
            yield oStore.Open();
        } catch (err) {
            alert('Failed to create CAdESCOM.Store: ' + err.number);
            return;
        }

        var CAPICOM_CERTIFICATE_FIND_SHA1_HASH = 0;
        var all_certs = yield oStore.Certificates;
        var oCerts = yield all_certs.Find(CAPICOM_CERTIFICATE_FIND_SHA1_HASH, thumbprint);

        if ((yield oCerts.Count) == 0) {
            alert("Certificate not found");
            return;
        }
        var certificate = yield oCerts.Item(1);

        var dataToDecr1 = document.getElementById("DataEncryptedBox1").value;
        var dataToDecr2 = document.getElementById("DataEncryptedBox2").value;
        var field;
        if(certListBoxId == 'CertListBox1')
            field ="DataEncryptedKey1";
        else
            field ="DataEncryptedKey2";

        var EncryptedKey = document.getElementById(field).value;
        try
        {
            FillCertInfo_Async(certificate, 'cert_info_decr');
            var errormes = "";

            try {
                var oSymAlgo = yield cadesplugin.CreateObjectAsync("cadescom.symmetricalgorithm");
            } catch (err) {
                errormes = "Failed to create cadescom.symmetricalgorithm: " + err;
                alert(errormes);
                throw errormes;
            }

            yield oSymAlgo.ImportKey(EncryptedKey, certificate);

            var oSesKey1DiversData = document.getElementById("DataEncryptedDiversData1").value;
            var oSesKey1IV = document.getElementById("DataEncryptedIV1").value;
            yield oSymAlgo.propset_DiversData(oSesKey1DiversData);
            var oSesKey1 = yield oSymAlgo.DiversifyKey();
            yield oSesKey1.propset_IV(oSesKey1IV);
            var EncryptedData1 = yield oSesKey1.Decrypt(dataToDecr1, 1);
            document.getElementById("DataDecryptedBox1").innerHTML = Base64.decode(EncryptedData1);

            var oSesKey2DiversData = document.getElementById("DataEncryptedDiversData2").value;
            var oSesKey2IV = document.getElementById("DataEncryptedIV2").value;
            yield oSymAlgo.propset_DiversData(oSesKey2DiversData);
            var oSesKey2 = yield oSymAlgo.DiversifyKey();
            yield oSesKey2.propset_IV(oSesKey2IV);
            var EncryptedData2 = yield oSesKey2.Decrypt(dataToDecr2, 1);
            document.getElementById("DataDecryptedBox2").innerHTML = Base64.decode(EncryptedData2);

            alert("Данные расшифрованы успешно:");
        }
        catch(err)
        {
            alert("Ошибка при шифровании данных:" + err);
            throw("Ошибка при шифровании данных:" + err);
        }
    }, certListBoxId);//cadesplugin.async_spawn
}

function RetrieveCertificate_Async()
{
    cadesplugin.async_spawn (function*(arg) {
        try {
            var PrivateKey = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX509PrivateKey");
        }
        catch (e) {
            alert('Failed to create X509Enrollment.CX509PrivateKey: ' + cadesplugin.getLastError(e));
            return;
        }

        yield PrivateKey.propset_ProviderName("Crypto-Pro GOST R 34.10-2001 Cryptographic Service Provider");
        yield PrivateKey.propset_ProviderType(75);
        yield PrivateKey.propset_KeySpec(1); //XCN_AT_KEYEXCHANGE

        try {
            var CertificateRequestPkcs10 = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX509CertificateRequestPkcs10");
        }
        catch (e) {
            alert('Failed to create X509Enrollment.CX509CertificateRequestPkcs10: ' + cadesplugin.getLastError(e));
            return;
        }

        yield CertificateRequestPkcs10.InitializeFromPrivateKey(0x1, PrivateKey, "");

        try {
            var DistinguishedName = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX500DistinguishedName");
        }
        catch (e) {
            alert('Failed to create X509Enrollment.CX500DistinguishedName: ' + cadesplugin.getLastError(e));
            return;
        }

        var CommonName = "Test Certificate";
        yield DistinguishedName.Encode("CN=\""+CommonName.replace(/"/g, "\"\"")+"\";");

        yield CertificateRequestPkcs10.propset_Subject(DistinguishedName);

        var KeyUsageExtension = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX509ExtensionKeyUsage");
        var CERT_DATA_ENCIPHERMENT_KEY_USAGE = 0x10;
        var CERT_KEY_ENCIPHERMENT_KEY_USAGE = 0x20;
        var CERT_DIGITAL_SIGNATURE_KEY_USAGE = 0x80;
        var CERT_NON_REPUDIATION_KEY_USAGE = 0x40;

        yield KeyUsageExtension.InitializeEncode(
                    CERT_KEY_ENCIPHERMENT_KEY_USAGE |
                    CERT_DATA_ENCIPHERMENT_KEY_USAGE |
                    CERT_DIGITAL_SIGNATURE_KEY_USAGE |
                    CERT_NON_REPUDIATION_KEY_USAGE);

        yield (yield CertificateRequestPkcs10.X509Extensions).Add(KeyUsageExtension);

        try {
            var Enroll = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX509Enrollment");
        }
        catch (e) {
            alert('Failed to create X509Enrollment.CX509Enrollment: ' + cadesplugin.getLastError(e));
            return;
        }

        yield Enroll.InitializeFromRequest(CertificateRequestPkcs10);

        var cert_req = yield Enroll.CreateRequest(0x1);

        var params = 'CertRequest=' + encodeURIComponent(cert_req) +
                     '&Mode=' + encodeURIComponent('newreq') +
                     '&TargetStoreFlags=' + encodeURIComponent('0') +
                     '&SaveCert=' + encodeURIComponent('no');

        var xmlhttp = getXmlHttp();
        xmlhttp.open("POST", "https://www.cryptopro.ru/certsrv/certfnsh.asp", true);
        xmlhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        var response;
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4) {
                if(xmlhttp.status == 200) {
                    cadesplugin.async_spawn (function*(arg) {
                        var response = arg[0];
                        var cert_data = "";

                        if(!isIE())
                        {
                            var start = response.indexOf("var sPKCS7");
                            var end = response.indexOf("sPKCS7 += \"\"") + 13;
                            cert_data = response.substring(start, end);
                        }
                        else
                        {
                            var start = response.indexOf("sPKCS7 & \"") + 9;
                            var end = response.indexOf("& vbNewLine\r\n\r\n</Script>");
                            cert_data = response.substring(start, end);
                            cert_data = cert_data.replace(new RegExp(" & vbNewLine",'g'),";");
                            cert_data = cert_data.replace(new RegExp("&",'g'),"+");
                            cert_data = "var sPKCS7=" + cert_data + ";";
                        }

                        eval(cert_data);

                        try {
                            var Enroll = yield cadesplugin.CreateObjectAsync("X509Enrollment.CX509Enrollment");
                        }
                        catch (e) {
                            alert('Failed to create X509Enrollment.CX509Enrollment: ' + cadesplugin.getLastError(e));
                            return;
                        }

                        yield Enroll.Initialize(0x1);
                        yield Enroll.InstallResponse(0, sPKCS7, 0x7, "");
                        var errormes = document.getElementById("boxdiv").style.display = 'none';
                        if(location.pathname.indexOf("simple")>=0) {
                            location.reload();
                        }
                        else if(location.pathname.indexOf("symalgo_sample.html")>=0){
                            FillCertList_Async('CertListBox1');
                            FillCertList_Async('CertListBox2');
                        }
                        else{
                            FillCertList_Async('CertListBox');
                        }
                    }, xmlhttp.responseText);//cadesplugin.async_spawn
                }
            }
        }
        xmlhttp.send(params);
    });//cadesplugin.async_spawn
}

function CheckForPlugInUEC_Async()
{
    var isUECCSPInstalled = false;

    cadesplugin.async_spawn(function *() {
        var oAbout = yield cadesplugin.CreateObjectAsync("CAdESCOM.About");

        var UECCSPVersion;
        var CurrentPluginVersion = yield oAbout.PluginVersion;
        if( typeof(CurrentPluginVersion) == "undefined")
            CurrentPluginVersion = yield oAbout.Version;

        var PluginBaseVersion = "1.5.1633";
        var arr = PluginBaseVersion.split('.');

        var isActualVersion = true;

        if((yield CurrentPluginVersion.MajorVersion) == parseInt(arr[0]))
        {
            if((yield CurrentPluginVersion.MinorVersion) == parseInt(arr[1]))
            {
                if((yield CurrentPluginVersion.BuildVersion) == parseInt(arr[2]))
                {
                    isActualVersion = true;
                }
                else if((yield CurrentPluginVersion.BuildVersion) < parseInt(arr[2]))
                {
                    isActualVersion = false;
                }
            }else if((yield CurrentPluginVersion.MinorVersion) < parseInt(arr[1]))
            {
                    isActualVersion = false;
            }
        }else if((yield CurrentPluginVersion.MajorVersion) < parseInt(arr[0]))
        {
            isActualVersion = false;
        }

        if(!isActualVersion)
        {
            document.getElementById('PluginEnabledImg').setAttribute("src", "app/crypto_pro/sources/yellow_dot.png");
            document.getElementById('PlugInEnabledTxt').innerHTML = "Плагин загружен, но он не поддерживает УЭК.";
        }
        else
        {
            document.getElementById('PluginEnabledImg').setAttribute("src", "app/crypto_pro/sources/green_dot.png");
            document.getElementById('PlugInEnabledTxt').innerHTML = "Плагин загружен.";

            try
            {
                var oUECard = yield cadesplugin.CreateObjectAsync("CAdESCOM.UECard");
                UECCSPVersion = yield oUECard.ProviderVersion;
                isUECCSPInstalled = true;
            }
            catch (err)
            {
                UECCSPVersion = "Нет информации";
            }

            if(!isUECCSPInstalled)
            {
                document.getElementById('PluginEnabledImg').setAttribute("src", "app/crypto_pro/sources/yellow_dot.png");
                document.getElementById('PlugInEnabledTxt').innerHTML = "Плагин загружен. Не установлен УЭК CSP.";
            }
        }
        document.getElementById('PlugInVersionTxt').innerHTML = "Версия плагина: " + (yield CurrentPluginVersion.toString());
        document.getElementById('CSPVersionTxt').innerHTML = "Версия УЭК CSP: " + (yield UECCSPVersion.toString());
    }); //cadesplugin.async_spawn
}

function FoundCertInStore_Async(cerToFind) {
    return new Promise(function(resolve, reject){
        cadesplugin.async_spawn(function *(args) {

            if((typeof cerToFind == "undefined") || (cerToFind == null))
                args[0](false);

            var oStore = yield cadesplugin.CreateObjectAsync("CAPICOM.store");
            if (!oStore) {
                alert("store failed");
                args[0](false);
            }
            try {
                yield oStore.Open();
            }
            catch (ex) {
                alert("Ошибка при открытии хранилища: " + cadesplugin.getLastError(ex));
                args[0](false);
            }

            var certCnt;

            var Certificates = yield oStore.Certificates;
            var certCnt = yield Certificates.Count;
            if(certCnt==0)
            {
                oStore.Close();
                args[0](false);
            }

            var ThumbprintToFind = yield cerToFind.Thumbprint;

            for (var i = 1; i <= certCnt; i++) {
                var cert;
                try {
                    cert = yield Certificates.Item(i);
                }
                catch (ex) {
                    alert("Ошибка при перечислении сертификатов: " + cadesplugin.getLastError(ex));
                    args[0](false);
                }

                try {
                    var Thumbprint = yield cert.Thumbprint;
                    if(Thumbprint == ThumbprintToFind) {
                        var dateObj = new Date();
                        var ValidToDate = new Date(yield cert.ValidToDate);
                        var HasPrivateKey = yield cert.HasPrivateKey();
                        var IsValid = yield cert.IsValid();
                        IsValid = yield IsValid.Result;

                        if(dateObj<ValidToDate && HasPrivateKey && IsValid) {
                            args[0](true);
                        }
                    }
                    else {
                        continue;
                    }
                }
                catch (ex) {
                    alert("Ошибка при получении свойства Thumbprint: " + cadesplugin.getLastError(ex));
                    args[0](false);
                }
            }
            oStore.Close();

            args[0](false);

        }, resolve, reject);
    });
}

function getUECCertificate_Async() {
    return new Promise(function(resolve, reject)
        {
            showWaitMessage("Выполняется загрузка сертификата, это может занять несколько секунд...");
            cadesplugin.async_spawn(function *(args) {
                try {
                    var oCard = yield cadesplugin.CreateObjectAsync("CAdESCOM.UECard");
                    var oCertTemp = yield oCard.Certificate;

                    if(typeof oCertTemp == "undefined")
                    {
                        document.getElementById("cert_info1").style.display = '';
                        document.getElementById("certerror").innerHTML = "Сертификат не найден или отсутствует.";
                        throw "";
                    }

                    if(oCertTemp==null)
                    {
                        document.getElementById("cert_info1").style.display = '';
                        document.getElementById("certerror").innerHTML = "Сертификат не найден или отсутствует.";
                        throw "";
                    }

                    if(yield FoundCertInStore_Async(oCertTemp)) {
                        FillCertInfo_Async(oCertTemp);
                        g_oCert = oCertTemp;
                    }
                    else {
                        document.getElementById("cert_info1").style.display = '';
                        document.getElementById("certerror").innerHTML = "Сертификат не найден в хранилище MY.";
                        throw "";
                    }
                    args[0]();
                }
                catch (e) {
                    var message = cadesplugin.getLastError(e);
                    if("The action was cancelled by the user. (0x8010006E)" == message) {
                        document.getElementById("cert_info1").style.display = '';
                        document.getElementById("certerror").innerHTML = "Карта не найдена или отсутствует сертификат на карте.";
                    }
                    args[1]();
                }
            }, resolve, reject);
        });
}

function createSignature_Async() {
    return new Promise(function(resolve, reject){
        cadesplugin.async_spawn(function *(args) {
            var signedMessage = "";
            try {
                var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
                yield oSigner.propset_Certificate(g_oCert);
                var CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN = 1;
                yield oSigner.propset_Options(CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN);

                var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
                yield oSignedData.propset_Content("DataToSign");

                var CADES_BES = 1;
                signedMessage = yield oSignedData.SignCades(oSigner, CADES_BES);
                args[0](signedMessage);
            }
            catch (e) {
                showErrorMessage("Ошибка: Не удалось создать подпись. Код ошибки: " + cadesplugin.getLastError(e));
                args[1]("");
            }
            args[0](signedMessage);
        }, resolve, reject);
    });
}

function verifyCert_Async() {
    if (!g_oCert) {
        removeWaitMessage();
        return;
    }
    createSignature_Async().then(
        function(signedMessage){
            document.getElementById("SignatureTxtBox").innerHTML = signedMessage;
            var x = document.getElementsByName("SignatureTitle");
            x[0].innerHTML = "Подпись сформирована успешно:";
            removeWaitMessage();
        },
        function(signedMessage){
            removeWaitMessage();
        }
    );
}

function isIE() {
    var retVal = (("Microsoft Internet Explorer" == navigator.appName) || // IE < 11
        navigator.userAgent.match(/Trident\/./i)); // IE 11
    return retVal;
}

	
	/*
	 * Метод извлекат текст (подписанный эцп текст из файла на сервере в кодировке Base64)
	 */
	function readStringFromFileAtPath(method, url) {
		  return new Promise(function (resolve, reject) {
		    var xhr = new XMLHttpRequest();
		    xhr.open(method, url);
		    xhr.onload = function () {
		      if (this.status >= 200 && this.status < 300) {
		        resolve(xhr.response);
		      } else {
		        reject({
		          status: this.status,
		          statusText: xhr.statusText
		        });
		      }
		    };
		    xhr.onerror = function () {
		      reject({
		        status: this.status,
		        statusText: xhr.statusText
		      });
		    };
		    xhr.send();
		  });
		}
	/*
	 * Метод используется при верефикации раздельной ЭЦП
	 * Метод с сервера вытягивает подписанный файл .docx и тд (раздельная подпись) и
	 * преобразовываем его в Base64
	 * При обычной загрузке теряются байты кодировки кирилици. Приходится преобразовывать вначале в массив 
	 * байтов потом в Uint8Array с послеующим преобразованием
	 */
	function readbinary(method, url) {
		return new Promise(function (resolve, reject) {
			var byteArray = [];
		    var xhr = new XMLHttpRequest();
		    xhr.open(method, url);
		    xhr.overrideMimeType('text\/plain; charset=x-user-defined');
		    xhr.onload = function () {
		      if (this.status >= 200 && this.status < 300) {
		    	  for (var i = 0; i < xhr.responseText.length; ++i) {
		    		    byteArray.push(xhr.responseText.charCodeAt(i) & 0xff)
		    		  }
		    	var t = _arrayBufferToBase64(byteArray);  
		        resolve(t);
		      } else {
		        reject({
		          status: this.status,
		          statusText: xhr.statusText
		        });
		      }
		    };
		    xhr.onerror = function () {
		      reject({
		        status: this.status,
		        statusText: xhr.statusText
		      });
		    };
		    xhr.send();
		  });
	}

	function _arrayBufferToBase64( buffer ) {
	    var binary = '';
	    var bytes = new Uint8Array( buffer );
	    var len = bytes.byteLength;
	    for (var i = 0; i < len; i++) {
	        binary += String.fromCharCode( bytes[ i ] );
	    }
	    return window.btoa( binary );
	}
	
	
async_resolve();