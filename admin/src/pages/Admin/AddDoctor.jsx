import { useState } from 'react'
import { assets } from '../../assets/assets'
import { useContext } from 'react';
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'
import axios from 'axios'



const AddDoctor = () => {

    const [docImg, setDocImg] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [experience, setExperience] = useState('1 Year');
    const [fees, setFees] = useState("");
    const [speciality, setSpeciality] = useState("General physician");
    const [degree, setDegree] = useState("");
    const [address1, setAddress1] = useState("");
    const [address2, setAddress2] = useState("");
    const [about, setAbout] = useState("");

    const { backendUrl, aToken } = useContext(AdminContext)


    const onSubmitHandler = async (event) => {
        event.preventDefault()

        try {

            if (!docImg) {
                return toast.error('Image Not Selected')
            }


            const formData = new FormData()
            formData.append('image', docImg)
            formData.append('name', name)
            formData.append('email', email)
            formData.append('password', password)
            formData.append('experience', experience)
            formData.append('fees', Number(fees))
            formData.append('speciality', speciality)
            formData.append('degree', degree)
            formData.append('address', JSON.stringify({ line1: address1, line2: address2 }))
            formData.append('about', about)

            // console log formData

            formData.forEach((value, key) => {
                console.log(`${key} : ${value}`)
            })

            const { data } = await axios.post(backendUrl + '/api/admin/add-doctor', formData, { headers: { aToken } })

            if (data.success) {
                toast.success(data.message)
                setDocImg(false)
                setName("");
                setEmail("");
                setPassword("");
                setExperience("1 Year");
                setFees("");
                setSpeciality("General physician");
                setDegree("");
                setAddress1("");
                setAddress2("");
                setAbout("");

            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
             
                 
            
        }
    }

    return (
        <form onSubmit={onSubmitHandler} className='m-5 w-full'>

            <p className='mb-3 text-lg font-medium'>
                Add Doctor
            </p>

            <div className='py-8 px-8 bg-[#fff] rounded w-full max-w-4xl max-h-[80vh] overflow-y-scroll'>

                {/* Image Upload */}
                <div className='flex items-center gap-4 mb-8 text-gray-500'>
                    <label htmlFor="doc-img">
                        <img
                            className='w-16 bg-gray-100 rounded-full cursor-pointer'
                            src={docImg ? URL.createObjectURL(docImg) : assets.upload_area}
                            alt=""
                        />
                    </label>
                    <input onChange={(e) => setDocImg(e.target.files[0])} type="file" id="doc-img" hidden />
                    <p>Upload doctor<br />picture</p>
                </div>

                <div className='flex flex-col lg:flex-row items-start gap-10 text-gray-600'>

                    {/* Left Inputs */}
                    <div className='w-full lg:flex-1 flex flex-col gap-4'>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Doctor Name</p>
                            <input onChange={(e) => setName(e.target.value)} value={name}
                                className='border border-[#d1d5db] rounded px-3 py-2'
                                type="text"
                                placeholder='Name'
                                required
                            />
                        </div>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Doctor Email</p>
                            <input onChange={(e) => setEmail(e.target.value)} value={email}
                                className='border border-[#d1d5db] rounded px-3 py-2'
                                type="email"
                                placeholder='Email'
                                required
                            />
                        </div>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Doctor Password</p>
                            <input onChange={(e) => setPassword(e.target.value)} value={password}
                                className='border border-[#d1d5db] rounded px-3 py-2'
                                type="password"
                                placeholder='Password'
                                required
                            />
                        </div>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Experience</p>
                            <select onChange={(e) => setExperience(e.target.value)} value={experience} className='border border-[#d1d5db] rounded px-3 py-2'>
                                <option>1 Year</option>
                                <option>2 Year</option>
                                <option>3 Year</option>
                                <option>4 Year</option>
                                <option>5 Year</option>
                                <option>6 Year</option>
                                <option>7 Year</option>
                                <option>8 Year</option>
                                <option>9 Year</option>
                                <option>10 Year</option>
                            </select>
                        </div>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Fees</p>
                            <input onChange={(e) => setFees(e.target.value)} value={fees}
                                className='border border-[#d1d5db] rounded px-3 py-2'
                                type="number"
                                placeholder='Fees'
                                required
                            />
                        </div>
                    </div>

                    {/* Right Inputs */}
                    <div className='w-full lg:flex-1 flex flex-col gap-4'>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Speciality</p>
                            <select onChange={(e) => setSpeciality(e.target.value)} value={speciality} className='border border-[#d1d5db] rounded px-3 py-2'>
                                <option>General physician</option>
                                <option>Gynecologist</option>
                                <option>Dermatologist</option>
                                <option>Pediatricians</option>
                                <option>Neurologist</option>
                                <option>Gastroenterologist</option>
                            </select>
                        </div>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Education</p>
                            <input onChange={(e) => setDegree(e.target.value)} value={degree}
                                className='border border-[#d1d5db] rounded px-3 py-2'
                                type="text"
                                placeholder='Education'
                                required
                            />
                        </div>

                        <div className='flex-1 flex flex-col gap-1'>
                            <p>Address</p>
                            <input onChange={(e) => setAddress1(e.target.value)} value={address1}
                                className='border border-[#d1d5db] rounded px-3 py-2'
                                type="text"
                                placeholder='address 1'
                                required
                            />
                            <input onChange={(e) => setAddress2(e.target.value)} value={address2}
                                className='border border-[#d1d5db] rounded px-3 py-2'
                                type="text"
                                placeholder='address 2'
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* About */}
                <div className='mt-4 mb-2'>
                    <p>About Doctor</p>
                    <textarea onChange={(e) => setAbout(e.target.value)} value={about}
                        className='border border-[#d1d5db] rounded w-full px-4 pt-2 mt-1'
                        placeholder='write about doctor'
                        rows={5}
                        required
                    />
                </div>

                {/* Button */}
                <button type='submit'
                    className='bg-primary text-[#fff] px-10 py-3 mt-4 rounded-full'
                >
                    Add Doctor
                </button>

            </div>
        </form>
    )
}

export default AddDoctor
