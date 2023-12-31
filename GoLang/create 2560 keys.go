package main

import (
	"fmt"
)

func main() {
	learningLanguages := []string{
		"English",
		"Spanish",
		"French",
		"German",
		"Italian",
		"Portuguese",
		"Russian",
		"Turkish",
		"Dutch",
		"Swedish",
		"Polish",
		"Norwegian",
		"Danish",
		"Finnish",
		"Hebrew",
		"Greek",
		"Indonesian",
		"Hindi",
		"Czech",
		"Romanian",
	}

	interfaceLanguages := []string{
		"Azerbaijani",
		"Aymara",
		"Albanian",
		"Amharic",
		"English",
		"Armenian",
		"Assamese",
		"Afrikaans",
		"Bambara",
		"Basque",
		"Belarusian",
		"Bengali",
		"Burmese",
		"Bulgarian",
		"Bosnian",
		"Bhojpuri",
		"Welsh",
		"Hungarian",
		"Vietnamese",
		"Hawaiian",
		"Galician",
		"Greek",
		"Georgian",
		"Guarani",
		"Gujarati",
		"Danish",
		"Dogri",
		"Zulu",
		"Hebrew",
		"Igbo",
		"Yiddish",
		"Ilocano",
		"Indonesian",
		"Irish",
		"Icelandic",
		"Spanish",
		"Italian",
		"Yoruba",
		"Kazakh",
		"Kannada",
		"Catalan",
		"Quechua",
		"Kyrgyz",
		"Konkani",
		"Korean",
		"Corsican",
		"Xhosa",
		"Creole",
		"Krio",
		"Kurdish",
		"Khmer",
		"Lao",
		"Latin",
		"Latvian",
		"Lingala",
		"Lithuanian",
		"Luganda",
		"Luxembourgish",
		"Maithili",
		"Macedonian",
		"Malagasy",
		"Malay",
		"Malayalam",
		"Maldivian",
		"Maltese",
		"Maori",
		"Marathi",
		"Meithei",
		"Mizo",
		"Mongolian",
		"German",
		"Nepali",
		"Dutch",
		"Norwegian",
		"Oriya",
		"Oromo",
		"Punjabi",
		"Persian",
		"Polish",
		"Portuguese",
		"Pashto",
		"Rwandan",
		"Romanian",
		"Russian",
		"Samoan",
		"Sanskrit",
		"Cebuano",
		"Sepedi",
		"Serbian",
		"Sesotho",
		"Sinhala",
		"Sindhi",
		"Slovak",
		"Slovenian",
		"Somali",
		"Swahili",
		"Sundanese",
		"Tajik",
		"Thai",
		"Tamil",
		"Tatar",
		"Telugu",
		"Tigrinya",
		"Tsonga",
		"Turkish",
		"Turkmen",
		"Uzbek",
		"Uighur",
		"Ukrainian",
		"Urdu",
		"Filipino",
		"Finnish",
		"French",
		"Frisian",
		"Hausa",
		"Hindi",
		"Hmong",
		"Croatian",
		"ChiChewa",
		"Chechen",
		"Czech",
		"Swedish",
		"Shona",
		"Scots Gaelic",
		"Ewe",
		"Esperanto",
		"Estonian",
		"Javanese",
	}

	for _, learning := range learningLanguages {
		for _, interf := range interfaceLanguages {
			// здесь learning и interf образуют одну связку
			fmt.Println(learning, "-", interf)
		}
	}
}
